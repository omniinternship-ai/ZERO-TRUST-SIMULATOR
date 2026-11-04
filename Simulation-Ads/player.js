(() => {
  'use strict';
  const simulator = new URL('../ZERO TRUST SIMULATOR.V0.0.3/ZERO TRUST SIMULATOR/index.html', document.currentScript.src);
  const destinations = new Map([
    ['shot-series', 'เปิดคลังซีรีส์'],
    ['minigames', 'เปิดคลังมินิเกม'],
    ['blocktown', 'เปิด BlockTown']
  ]);
  let lastCampaign;

  function attach(container, placement, isActive, navigate, isPlaying = isActive) {
    if (!container) return;
    const ad = document.createElement('section');
    ad.className = 'sim-ad';
    ad.hidden = true;
    ad.setAttribute('aria-label', 'โฆษณาจำลอง');
    ad.innerHTML = '<div class="sim-ad__content"><small></small><strong></strong><p></p><button type="button"></button><button type="button">ปิดโฆษณา</button></div>';
    ad.querySelector('.sim-ad__content').insertAdjacentHTML('afterbegin', `
      <svg class="sim-ad__art" viewBox="0 0 104 76" aria-hidden="true">
        <path d="m13 34 28-13 27 13-27 14Z" fill="#8db9ff"/>
        <path d="M13 34v23l28 14V48Z" fill="#2458b8"/>
        <path d="M41 48v23l27-14V34Z" fill="#487ce1"/>
        <path d="m34 36 15-7" stroke="#163571" stroke-width="4" stroke-linecap="round"/>
        <circle cx="43" cy="16" r="11" fill="#ffd56a" stroke="#aa6813" stroke-width="2"/>
        <path d="M64 55h33v14H64z" fill="#257051"/>
        <path d="M59 48h38v15H59z" fill="#bcebd3" stroke="#257051" stroke-width="2"/>
        <path d="M63 41h35v14H63z" fill="#d7f6e6" stroke="#257051" stroke-width="2"/>
        <circle cx="80" cy="48" r="4" fill="#257051"/>
        <path d="M77 42v26h8V42z" fill="#ffc852" opacity=".85"/>
      </svg>`);
    const [visit, close] = ad.querySelectorAll('button');
    let activeSeconds = 0;
    let shown = false;
    let campaign;
    container.append(ad);
    close.onclick = () => { ad.hidden = true; };
    visit.onclick = () => {
      if (ad.hidden || !campaign) return;
      ad.hidden = true;
      navigate(campaign.destination);
    };

    setInterval(() => {
      if (!isActive()) {
        ad.hidden = true;
        activeSeconds = 0;
        shown = false;
        return;
      }
      if (document.hidden || shown || !isPlaying() || ++activeSeconds < 18) return;
      const available = (window.SimulationAdCatalog || []).filter(row =>
        row.placements.includes(placement) && destinations.has(row.destination) && row.weight > 0);
      const fresh = available.filter(row => row.id !== lastCampaign);
      const pool = fresh.length ? fresh : available;
      let draw = Math.random() * pool.reduce((sum, row) => sum + row.weight, 0);
      campaign = pool.find(row => (draw -= row.weight) < 0);
      if (!campaign) return;
      shown = true;
      lastCampaign = campaign.id;
      ad.classList.toggle('sim-ad--full', Math.random() < 0.35);
      ad.querySelector('small').textContent = 'โฆษณาจำลอง · ' + campaign.advertiser;
      ad.querySelector('strong').textContent = campaign.title;
      ad.querySelector('p').textContent = campaign.body;
      visit.textContent = campaign.cta || destinations.get(campaign.destination);
      ad.hidden = false;
    }, 1000);
  }

  const video = document.getElementById('episodeVideo');
  const viewer = document.getElementById('viewer');
  if (video && viewer) {
    attach(viewer, 'video', () => viewer.open && !video.hidden && !video.ended,
      destination => {
        if (window.parent !== window && location.origin !== 'null') {
          window.parent.postMessage({ type: 'simulation-ad-route', destination }, location.origin);
        } else if (destination === 'shot-series') {
          viewer.close();
          document.getElementById('detail')?.close();
        } else {
          simulator.searchParams.set('adDestination', destination);
          location.assign(simulator.href);
        }
      }, () => !video.paused && video.readyState >= 2);
  }

  const phone = document.querySelector('.phone-screen');
  if (!phone) return;

  function openDestination(destination) {
    if (!destinations.has(destination)) return;
    const icon = phone.querySelector(`[data-app-id="${destination}"]`);
    if (!icon) return;
    window.SimulationShot?.close();
    const external = phone.querySelector('.external-game-screen:not([hidden])');
    external?.querySelector('.external-game-bar button')?.click();
    if (window.TetrisEngine?.isPlaying) document.getElementById('tetrisBackToLobbyBtn')?.click();
    icon.click();
  }

  window.addEventListener('message', event => {
    const frame = phone.querySelector('.shot-app:not([hidden]) iframe');
    if (!frame || event.source !== frame.contentWindow || event.origin !== location.origin) return;
    if (event.data?.type === 'simulation-ad-route') openDestination(event.data.destination);
  });

  attach(phone, 'minigame', () => Boolean(
    phone.querySelector('.external-game-screen:not([hidden]) iframe') ||
    (window.TetrisEngine?.isPlaying && !window.TetrisEngine.isGameOver)
  ), openDestination);

  const url = new URL(location.href);
  const pending = url.searchParams.get('adDestination');
  if (destinations.has(pending)) {
    const icon = phone.querySelector(`[data-app-id="${pending}"]`);
    const timer = setInterval(() => {
      if (!icon?.getClientRects().length || getComputedStyle(icon).visibility !== 'visible') return;
      clearInterval(timer);
      url.searchParams.delete('adDestination');
      history.replaceState(history.state, '', url);
      openDestination(pending);
    }, 350);
  }
})();
