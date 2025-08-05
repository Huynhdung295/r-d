import { DirectusClient } from './directusSDK.js';

const client = new DirectusClient('https://countries.trevorblades.com');

const countriesDef = {
  name: 'countries',
  fields: [
    'code',
    'name',
    { continent: ['name'] },
    { languages: ['name'] },
  ],
};

client.defineType('countries', {
  code: '',
  name: '',
  continent: { name: '' },
  languages: [{ name: '' }],
});

const state = client
  .query(countriesDef, {
    filter: { code: { in: ['VN', 'JP', 'US'] } },
  })
  .key('countryQuery')
  .prefix('asiaGroup')
  .use();

// ✅ Listen realtime
client.listen('asiaGroup', (val) => {
  const status = document.getElementById('status');
  if (status) status.textContent = val.loading ? '⏳ Loading...' : '✅ Ready';
  console.log('📡 Store Updated:', val);
});

async function render() {
  const ul = document.getElementById('country-list');
  ul.innerHTML = '<li>⏳ Loading...</li>';

  await state.refetch();

  ul.innerHTML = '';
  if (state.error) {
    ul.innerHTML = `<li>❌ Error: ${state.error.message}</li>`;
    return;
  }

  state.data?.forEach((c) => {
    const li = document.createElement('li');
    li.textContent = `${c.code} - ${c.name}`;
    ul.appendChild(li);
  });
}


render()
document.getElementById('refetchBtn').addEventListener('click', render);

// ❌ mutate() bị loại bỏ, dùng update()
document.getElementById('mutateBtn').addEventListener('click', () => {
  const fake = [
    {
      code: 'ZZ',
      name: 'Testland',
      continent: { name: 'Nowhere' },
      languages: [{ name: 'Testish' }],
    },
  ];
  client.update('countries', 'data', fake); // update vào store
  render()
});

document.getElementById('viewStoreBtn').addEventListener('click', () => {
  const store = client.store('countries').prefix('asiaGroup').get();
  console.log('🧠 Full Store:', store);
});
