import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

describe('Accounts (SQLite)', () => {
  let app: INestApplication;
  const directory = mkdtempSync(join(tmpdir(), 'accounts-'));
  const previousUrl = process.env.DATABASE_URL;

  beforeAll(async () => {
    process.env.DATABASE_URL = `file:${join(directory, 'test.db')}`;
    execFileSync(
      process.execPath,
      ['node_modules/prisma/build/index.js', 'migrate', 'deploy'],
      { env: process.env },
    );
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  }, 30000);

  afterAll(async () => {
    await app?.close();
    if (previousUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousUrl;
    rmSync(directory, { recursive: true, force: true });
  });

  it('normaliza errores de dominio, HTTP y rutas desconocidas con RFC 9457', async () => {
    for (const [path, status, code] of [
      ['/accounts/999999', 404, 'ACCOUNT_NOT_FOUND'],
      ['/accounts/abc', 400, 'INVALID_ACCOUNT'],
      ['/ruta-inexistente', 404, 'HTTP_404'],
    ] as const) {
      const response = await request(app.getHttpServer())
        .get(path)
        .expect(status);
      expect(response.headers['content-type']).toContain(
        'application/problem+json',
      );
      expect(response.body).toMatchObject({ status, code, instance: path });
      expect(response.body.type).toMatch(/^urn:accounting:problem:/);
      expect(typeof response.body.title).toBe('string');
      expect(typeof response.body.detail).toBe('string');
      expect(response.body).not.toHaveProperty('stack');
    }
    const invalid = await request(app.getHttpServer())
      .post('/accounts')
      .send({ unknown: true })
      .expect(400);
    expect(invalid.body.code).toBe('HTTP_400');
  });

  it('valida jerarquía, naturaleza, CRUD y eliminación restringida', async () => {
    const api = () => request(app.getHttpServer());
    await api()
      .post('/accounts')
      .send({ code: '31', name: 'Sin padre' })
      .expect(400);
    await api()
      .post('/accounts')
      .send({ code: '123', name: 'Inválido' })
      .expect(400);
    await api()
      .post('/accounts')
      .send({ code: '1', name: 'Activo' })
      .expect(400);
    await api()
      .post('/accounts')
      .send({ code: '1', name: 'Activo', nature: 'DEBIT' })
      .expect(201);
    await api()
      .post('/accounts')
      .send({ code: '1', name: 'Duplicado', nature: 'DEBIT' })
      .expect(409);
    await api()
      .post('/accounts')
      .send({ code: '11', name: 'Disponible', nature: 'CREDIT' })
      .expect(400);
    for (const [code, name] of [
      ['11', 'Disponible'],
      ['1105', 'Caja'],
      ['110505', 'Caja general'],
      ['110510', 'Caja menor'],
    ]) {
      const result = await api()
        .post('/accounts')
        .send({ code, name })
        .expect(201);
      expect(result.body.nature).toBe('DEBIT');
    }
    const list = await api().get('/accounts').expect(200);
    expect(list.body).toHaveLength(5);
    const children = await api().get('/accounts?parentCode=1105').expect(200);
    expect(children.body).toHaveLength(2);
    const detail = await api().get('/accounts/110505').expect(200);
    expect(detail.body).toMatchObject({
      parentCode: '1105',
      level: 'SUBACCOUNT',
    });
    await api()
      .patch('/accounts/110505')
      .send({ name: 'Caja principal' })
      .expect(200);
    await api().patch('/accounts/110505').send({ code: '110599' }).expect(400);
    for (const code of ['1', '11', '1105'])
      await api().delete(`/accounts/${code}`).expect(409);
    for (const code of ['110505', '110510', '1105', '11', '1'])
      await api().delete(`/accounts/${code}`).expect(204);
    await api().get('/accounts/1').expect(404);
    await api().patch('/accounts/1').send({ name: 'No existe' }).expect(404);
    await api().delete('/accounts/1').expect(404);
  });
});
