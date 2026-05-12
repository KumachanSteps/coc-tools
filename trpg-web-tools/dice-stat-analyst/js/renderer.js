/*
  renderer.js
  画面描画・タブ切替・ソート・ショートカットモーダル表示文言補助

  Translation-ready:
  - 画面に出す動的文言は tr("key", "fallback") 経由にする
  - i18n.js / language.js 側に t() があればそれを使用
  - t() が未定義でも fallback 日本語で動作
*/

function tr(key, fallback, vars = {}) {
  let text = fallback;

  if (typeof t === 'function') {
    text = t(key, fallback, vars);
  }

  return String(text).replace(/\{(\w+)\}/g, (_, name) => {
    return Object.prototype.hasOwnProperty.call(vars, name) ? vars[name] : `{${name}}`;
  });
}

function switchTab(button) {
  document.querySelectorAll('.tab-button').forEach(item => item.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(item => item.classList.remove('active'));

  button.classList.add('active');
  $(button.dataset.tab).classList.add('active');
}

function toggleSort(key) {
  if (state.sort.key === key) {
    state.sort.direction = state.sort.direction === 'asc' ? 'desc' : 'asc';
  } else {
    state.sort = { key, direction: 'asc' };
  }

  renderTable();
}

function getSortedVisibleRolls() {
  const direction = state.sort.direction === 'desc' ? -1 : 1;
  const rolls = getVisibleRolls().map((roll, index) => ({
    ...roll,
    originalIndex: index
  }));

  rolls.sort((a, b) => {
    let result = state.sort.key === 'character'
      ? compareCharacterNames(a.character || tr('common.unknown', '不明'), b.character || tr('common.unknown', '不明'))
      : state.sort.key === 'value'
        ? a.value - b.value
        : state.sort.key === 'classification'
          ? classificationOrder(classifyRoll(a)) - classificationOrder(classifyRoll(b))
          : a.originalIndex - b.originalIndex;

    if (result === 0) result = a.originalIndex - b.originalIndex;
    return result * direction;
  });

  return rolls;
}

function render() {
  renderCharacterControls();
  renderSummary();
  renderCharacterSummary();
  renderChart();
  renderTable();
  applyInputPanelLayout();

  if (typeof applyTranslations === 'function') {
    applyTranslations();
  }
}

function renderSummary() {
  const rolls = getVisibleRolls();
  const total = rolls.length;
  const values = rolls.map(roll => roll.value);
  const outcome = getOutcomeCounts(rolls);
  const average = total
    ? values.reduce((a, b) => a + b, 0) / total
    : null;

  $('totalRolls').textContent = total;
  $('successFailCount').textContent = `${outcome.success} / ${outcome.fail}`;
  $('successFailRate').textContent = `${rate(outcome.success, total)}% / ${rate(outcome.fail, total)}%`;
  $('critFumbleCount').textContent = `${outcome.critical} / ${outcome.fumble}`;
  $('critFumbleRate').textContent = `${rate(outcome.critical, total)}% / ${rate(outcome.fumble, total)}%`;
  $('averageRoll').textContent = average === null ? '-' : average.toFixed(2);

  if (!total) {
    $('summaryMemo').textContent = state.rolls.length
      ? tr(
          'summary.noVisibleRolls',
          '表示対象のロールがありません。キャラクターのチェックを戻してください。'
        )
      : tr(
          'summary.selectLog',
          'ログデータを選択ください。'
        );
    return;
  }

  const all = state.rolls.length;
  const hidden = all - total;
  const characters = getDetectedCharacters().length;

  $('summaryMemo').textContent = tr(
    'summary.memo',
    '検出した{all}件のd100ロールのうち、表示対象{total}件を集計しました。検出キャラクター数は{characters}です。非表示ロール数は{hidden}件です。総ロール数{threshold}以下のキャラクターは初期状態で非表示です。クリティカル判定は{critMax}以下、ファンブル判定は{fumbleMin}以上です。',
    {
      all,
      total,
      characters,
      hidden,
      threshold: $('autoHideMaxRolls').value,
      critMax: $('critMax').value,
      fumbleMin: $('fumbleMin').value
    }
  );
}

function renderCharacterControls() {
  const box = $('characterControls');
  const button = $('characterControlToggleBtn');
  const characters = getDetectedCharacters();

  if (!box) return;

  box.classList.toggle('visible', state.showCharacterControls);

  if (button) {
    button.textContent = state.showCharacterControls
      ? tr('button.hideCharacterControls', '表示キャラ設定を隠す')
      : tr('button.showCharacterControls', '表示キャラ設定を開く');
  }

  if (!characters.length) {
    box.innerHTML = '';
    if (button) button.style.display = 'none';
    return;
  }

  if (button) button.style.display = 'inline-flex';

  box.innerHTML = characters.map(name => {
    const checked = state.hiddenCharacters.has(name) ? '' : 'checked';
    const count = state.rolls.filter(roll => (roll.character || tr('common.unknown', '不明')) === name).length;

    return `
      <label class="character-toggle">
        <input type="checkbox" data-character="${escapeAttribute(name)}" ${checked}>
        ${escapeHtml(name)} (${count})
      </label>
    `;
  }).join('');

  box.querySelectorAll('input[data-character]').forEach(input => {
    input.addEventListener('change', () => {
      const name = input.getAttribute('data-character') || tr('common.unknown', '不明');

      if (input.checked) {
        state.hiddenCharacters.delete(name);
      } else {
        state.hiddenCharacters.add(name);
      }

      state.inputPanelMode = state.inputPanelMode === 'open' ? 'open' : 'auto';
      render();
    });
  });
}

function renderCharacterSummary() {
  const box = $('characterSummary');
  if (!box) return;

  const grouped = groupRollsByCharacter(getVisibleRolls());
  const names = Object.keys(grouped).sort(compareCharacterNames);

  box.innerHTML = names.length
    ? names.map(name => renderCharacterCard(name, grouped[name])).join('')
    : `
      <div class="card">
        <p class="note">
          ${escapeHtml(tr('summary.noVisibleCharacters', '表示対象のキャラクターがありません。キャラクターのチェックを戻してください。'))}
        </p>
      </div>
    `;
}

function renderCharacterCard(name, rolls) {
  const values = rolls.map(roll => roll.value);
  const total = values.length;
  const outcome = getOutcomeCounts(rolls);
  const average = total
    ? values.reduce((a, b) => a + b, 0) / total
    : 0;

  return `
    <div class="card character-card">
      <h3>${escapeHtml(name)}</h3>

      <div class="mini-stats">
        <div class="mini-stat">
          <div class="label">${escapeHtml(tr('label.totalRolls', '総ロール'))}</div>
          <div class="value">${total}</div>
        </div>

        <div class="mini-stat">
          <div class="label">${escapeHtml(tr('label.averageRoll', '平均出目'))}</div>
          <div class="value">${average.toFixed(2)}</div>
        </div>

        <div class="mini-stat">
          <div class="label">${escapeHtml(tr('label.successFail', '成功 / 失敗'))}</div>
          <div class="value">${outcome.success} / ${outcome.fail}</div>
          <div class="label">${rate(outcome.success, total)}% / ${rate(outcome.fail, total)}%</div>
        </div>

        <div class="mini-stat">
          <div class="label">${escapeHtml(tr('label.critFumble', 'クリティカル / ファンブル'))}</div>
          <div class="value">${outcome.critical} / ${outcome.fumble}</div>
          <div class="label">${rate(outcome.critical, total)}% / ${rate(outcome.fumble, total)}%</div>
        </div>
      </div>

      ${renderBins(values)}
    </div>
  `;
}

function renderChart() {
  const box = $('barChart');
  if (!box) return;

  const grouped = groupRollsByCharacter(getVisibleRolls());
  const names = Object.keys(grouped).sort(compareCharacterNames);

  box.innerHTML = names.length
    ? names.map(name => `
      <div class="card" style="margin-bottom:12px;">
        <h3>${escapeHtml(name)}</h3>
        ${renderBins(grouped[name].map(roll => roll.value))}
      </div>
    `).join('')
    : `<p class="note">${escapeHtml(tr('chart.noVisibleRolls', '表示対象のロールがありません。'))}</p>`;
}

function renderBins(values) {
  const bins = Array.from({ length: 10 }, (_, index) => ({
    label: `${index * 10 + 1}-${index * 10 + 10}`,
    count: 0
  }));

  values.forEach(value => {
    bins[Math.min(9, Math.floor((value - 1) / 10))].count++;
  });

  const max = Math.max(1, ...bins.map(bin => bin.count));
  const total = values.length;

  return bins.map(bin => `
    <div class="chart-row">
      <div>${bin.label}</div>
      <div class="bar-wrap">
        <div class="bar" style="width:${(bin.count / max) * 100}%"></div>
      </div>
      <div>
        ${tr('chart.countRate', '{count}件 / {rate}%', {
          count: bin.count,
          rate: rate(bin.count, total)
        })}
      </div>
    </div>
  `).join('');
}

function renderTable() {
  $('rollTableBody').innerHTML = getSortedVisibleRolls().map((roll, index) => {
    const label = classifyRoll(roll);
    const pill = label === 'Critical'
      ? 'crit'
      : label === 'Fumble'
        ? 'fumble'
        : label === 'Success'
          ? 'success'
          : label === 'Fail'
            ? 'fail'
            : 'normal';

    return `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(roll.character || tr('common.unknown', '不明'))}</td>
        <td><strong>${roll.value}</strong></td>
        <td><span class="pill ${pill}">${escapeHtml(getTranslatedClassification(label))}</span></td>
        <td>${escapeHtml(roll.line)}</td>
      </tr>
    `;
  }).join('');
}

function getTranslatedClassification(label) {
  const map = {
    Critical: tr('classification.critical', 'Critical'),
    Fumble: tr('classification.fumble', 'Fumble'),
    Success: tr('classification.success', 'Success'),
    Fail: tr('classification.fail', 'Fail'),
    Normal: tr('classification.normal', 'Normal')
  };

  return map[label] || label;
}

function applyInputPanelLayout() {
  const layout = $('appLayout');
  const button = $('inputToggleBtn');

  if (!layout || !button) return;

  const count = Object.keys(groupRollsByCharacter(getVisibleRolls()))
    .filter(name => name !== tr('common.unknown', '不明'))
    .length;

  const collapse = state.inputPanelMode === 'collapsed'
    || (state.inputPanelMode === 'auto' && count >= 4);

  layout.classList.toggle('input-collapsed', collapse);
  button.textContent = collapse ? '⇥' : '⇤';
  button.title = collapse
    ? tr('button.openInputPanel', '入力パネルを開く')
    : tr('button.collapseInputPanel', '入力パネルを畳む');
}