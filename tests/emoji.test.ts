import express from 'express';
import request from 'supertest';
import {describe, expect, it} from 'vitest';
import {emojiFavicon} from '@/middle/emoji';

describe('emojiFavicon', () => {
	const app = express();
	app.use(emojiFavicon('🚀'));
	app.get('/other', (_, res) => res.send('ok'));

	it('should return SVG with correct content-type for /favicon.ico', async () => {
		const res = await request(app).get('/favicon.ico');
		expect(res.status).toBe(200);
		expect(res.headers['content-type']).toContain('image/svg+xml');
		expect(res.body.toString()).toContain('🚀');
	});

	it('should pass through for non-favicon routes', async () => {
		const res = await request(app).get('/other');
		expect(res.status).toBe(200);
		expect(res.text).toBe('ok');
	});
});
