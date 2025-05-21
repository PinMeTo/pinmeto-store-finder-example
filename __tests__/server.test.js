const request = require('supertest');
const app = require('../server');

describe('Server Endpoints', () => {
  it('should serve the main page', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
    expect(response.type).toBe('text/html');
  });

  it('should serve static files', async () => {
    const response = await request(app).get('/public/styles.css');
    expect(response.status).toBe(200);
    expect(response.type).toBe('text/css');
  });
}); 