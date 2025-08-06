// __tests__/DirectusClient.test.js
import { DirectusClient } from '../sdk/DirectusClient';
import axios from 'axios';

jest.mock('axios');

describe('DirectusClient - Full Coverage', () => {
  let client;

  beforeEach(() => {
    client = new DirectusClient('https://example.com');
    client.setToken('token123').setLanguage('en');
  });

  test('setToken and setLanguage chainable', () => {
    const result = client.setToken('abc').setLanguage('vi');
    expect(result).toBe(client);
    expect(client.token).toBe('abc');
    expect(client.language).toBe('vi');
  });

  test('autoAuthWithHeader and fallback resolution', () => {
    const result = client.autoAuthWithHeader('custom-auth', { backup: [{ key: 'header', value: 'auth' }] });
    const headers = result._resolveAuthHeader({ auth: 'abc123' });
    expect(headers['custom-auth']).toBe('abc123');
  });

  test('create, updateItem, deleteItem should call axios', async () => {
    axios.post.mockResolvedValue({ data: 'ok' });
    axios.patch.mockResolvedValue({});
    axios.delete.mockResolvedValue({});

    await client.create('posts', { title: 'A' });
    await client.updateItem('posts', 1, { title: 'B' });
    await client.deleteItem('posts', 1);

    expect(axios.post).toHaveBeenCalled();
    expect(axios.patch).toHaveBeenCalled();
    expect(axios.delete).toHaveBeenCalled();
  });

  test('query().exec() handles errors', async () => {
    axios.post.mockRejectedValueOnce(new Error('fail'));
    const result = await client.query({ name: 'failTest', fields: ['id'] }).exec();
    expect(result._data).toBeNull();
    expect(result._error).toBeInstanceOf(Error);
  });

  test('query().exec() with map()', async () => {
    axios.post.mockResolvedValueOnce({ data: { data: { users: [{ id: 1 }] } } });
    const result = await client.query({ name: 'users', fields: ['id'] }, { map: (r) => ({ ...r, x: true }) }).exec();
    expect(result._data[0].x).toBe(true);
  });

  test('query().use() and refetch with preserve=false emits update', async () => {
    axios.post.mockResolvedValueOnce({ data: { data: { books: [{ id: 99 }] } } });
    const state = client.query({ name: 'books', fields: ['id'] }, {}).key('preserveKey').prefix('books').use();
    await state.refetch({ force: true });
    expect(client.get('books').data[0].id).toBe(99);
  });

  test('watch/unlisten functionality', () => {
    const cb = jest.fn();
    client.listen('testKey', cb);
    client.save('testKey', { a: 1 });
    expect(cb).toHaveBeenCalledWith({ a: 1 });
    client.unlisten('testKey', cb);
    client.save('testKey', { a: 2 });
    expect(cb).toHaveBeenCalledTimes(1);
  });

  test('update with nested path', () => {
    client.save('deep', { a: { b: 1 } });
    client.update('deep', 'a.b', 999);
    expect(client.get('deep.a.b')).toBe(999);
  });

  test('refetch onError/onSuccess/onFinally callbacks work', async () => {
    const onError = jest.fn();
    const onSuccess = jest.fn();
    const onFinally = jest.fn();

    axios.post.mockResolvedValueOnce({ data: { data: { books: [{ id: 100 }] } } });

    client
      .query({ name: 'books', fields: ['id'] }, {})
      .key('cbTest')
      .prefix('books')
      .use()
      .refetch({ force: true, onSuccess, onError, onFinally });

    await new Promise((r) => setTimeout(r, 10));
    expect(onSuccess).toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    expect(onFinally).toHaveBeenCalled();
  });

  test('preserve = true does not emit if unchanged', async () => {
    const spy = jest.fn();
    client.listen('books', spy);
    axios.post.mockResolvedValue({ data: { data: { books: [{ id: 1 }] } } });
    const state = client.query({ name: 'books', fields: ['id'] }, { preserve: true }).key('k1').prefix('books').use();
    await state.refetch();
    expect(spy).toHaveBeenCalledTimes(1); // initial emit only
  });

  test('withRetry exceeds maxRetries and throws', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('fail'));
    await expect(client.withRetry(fn, 2, 10)).rejects.toThrow('fail');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test('invalidate deletes store', () => {
    client.save('x', { hello: 'world' });
    expect(client.get('x')).toBeTruthy();
    client.invalidate('x');
    expect(client.get('x')).toBeUndefined();
  });
});
