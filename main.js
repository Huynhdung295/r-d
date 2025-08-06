import { DirectusClient } from './directusSdk/directusSDK.js';

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

const state = client
  .query(countriesDef, {
    filter: { code: { in: ['VN', 'JP', 'US'] } },
    preserve: false,
  })
  .key('countryQuery')
  .prefix('asiaGroup')
  .use();

// Listen to changes
client.listen('asiaGroup', (val) => {
  const status = document.getElementById('status');
  if (status) status.textContent = val.loading ? '⏳ Loading...' : '✅ Ready';
  console.log('📡 Store Updated:', val);
});

async function render() {
  const ul = document.getElementById('country-list');
  ul.innerHTML = '<li>⏳ Loading...</li>';

  await state.refetch({
    force: true,
    onError: (e) => console.error('❌ Error refetching:', e),
    onSuccess: (data) => console.log('✅ Data fetched:', data),
    onFinally: () => console.log('🏁 Refetch complete'),
  });

  ul.innerHTML = '';
  if (state.error) {
    ul.innerHTML = `<li>❌ Error: ${state.error.message}</li>`;
    return;
  }

  if (state.data?.length === 0) {
    ul.innerHTML = '<li>⚠️ No data available</li>';
    return;
  }

  state.data.forEach((c) => {
    const li = document.createElement('li');
    li.textContent = `${c.code} - ${c.name} (${c.continent?.name}) [Langs: ${c.languages.map(l => l.name).join(', ')}]`;
    ul.appendChild(li);
  });
}

render();

document.getElementById('refetchBtn').addEventListener('click', render);

document.getElementById('mutateBtn').addEventListener('click', () => {
  const fake = [
    {
      code: 'ZZ',
      name: 'Testland',
      continent: { name: 'Nowhere' },
      languages: [{ name: 'Testish' }],
    },
  ];
  client.update('countries', 'data', fake); // update into store
  render();
});

document.getElementById('viewStoreBtn').addEventListener('click', () => {
  const store = client.store('countries').get();
  console.log('🧠 Full Store Snapshot:', store);
});
