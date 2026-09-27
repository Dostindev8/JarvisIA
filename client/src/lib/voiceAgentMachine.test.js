import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { agentReducer, initialAgentState, matchIntent, normalizeText, AGENT_STATES } from './voiceAgentMachine.js';

const script = JSON.parse(readFileSync(new URL('./agent-script.json', import.meta.url), 'utf8'));
const { IDLE, LISTENING, THINKING, SPEAKING, ERROR } = AGENT_STATES;

function run(events, from = initialAgentState) {
  return events.reduce((s, e) => agentReducer(s, typeof e === 'function' ? e(s) : e), from);
}

const fullTurn = [
  { type: 'LISTEN' },
  (s) => ({ type: 'HEARD', text: 'qué eres', turn: s.turn }),
  (s) => ({ type: 'RESPOND', text: 'Soy JarvisIA', turn: s.turn }),
  (s) => ({ type: 'SPEAK_END', turn: s.turn })
];

test('ciclo completo idle→listening→thinking→speaking→idle, dos veces seguidas', () => {
  const statuses = [];
  let s = initialAgentState;
  for (let round = 0; round < 2; round += 1) {
    for (const e of fullTurn) {
      s = agentReducer(s, typeof e === 'function' ? e(s) : e);
      statuses.push(s.status);
    }
  }
  assert.deepEqual(statuses, [LISTENING, THINKING, SPEAKING, IDLE, LISTENING, THINKING, SPEAKING, IDLE]);
  assert.equal(s.turn, 2);
});

test('error alcanzable desde cada estado activo y siempre vuelve a idle', () => {
  const prefixes = { [IDLE]: [], [LISTENING]: fullTurn.slice(0, 1), [THINKING]: fullTurn.slice(0, 2), [SPEAKING]: fullTurn.slice(0, 3) };
  for (const [status, prefix] of Object.entries(prefixes)) {
    const before = run(prefix);
    assert.equal(before.status, status);
    const failed = agentReducer(before, { type: 'FAIL', message: 'red caída' });
    assert.equal(failed.status, ERROR, `FAIL desde ${status}`);
    assert.equal(failed.caption, 'red caída');
    assert.equal(agentReducer(failed, { type: 'RESET' }).status, IDLE);
  }
});

test('tras un error se puede volver a hablar (segundo intento)', () => {
  const failed = run([...fullTurn.slice(0, 2), { type: 'FAIL', message: 'timeout' }]);
  const retry = run(fullTurn, failed);
  assert.equal(retry.status, IDLE);
  assert.equal(retry.error, null);
});

test('callbacks de un turno viejo se ignoran', () => {
  const s1 = run(fullTurn.slice(0, 1));
  const staleTurn = s1.turn;
  const s2 = run([{ type: 'STOP' }, { type: 'LISTEN' }], s1);
  const after = agentReducer(s2, { type: 'HEARD', text: 'eco viejo', turn: staleTurn });
  assert.equal(after, s2);
});

test('transiciones inválidas no cambian el estado', () => {
  assert.equal(agentReducer(initialAgentState, { type: 'SPEAK_END' }), initialAgentState);
  assert.equal(agentReducer(initialAgentState, { type: 'HEARD', text: 'x' }), initialAgentState);
  assert.equal(agentReducer(initialAgentState, { type: 'RESET' }), initialAgentState);
  const thinking = run(fullTurn.slice(0, 2));
  assert.equal(agentReducer(thinking, { type: 'LISTEN' }), thinking);
});

test('intro: RESPOND desde idle abre turno nuevo y termina en idle', () => {
  const s = run([{ type: 'RESPOND', text: 'intro' }]);
  assert.equal(s.status, SPEAKING);
  assert.equal(s.turn, 1);
  assert.equal(agentReducer(s, { type: 'SPEAK_END', turn: 1 }).status, IDLE);
});

test('pregunta escrita (ASK) abre turno desde idle, speaking o error', () => {
  const fromIdle = agentReducer(initialAgentState, { type: 'ASK', text: 'hola' });
  assert.equal(fromIdle.status, THINKING);
  assert.equal(fromIdle.turn, 1);
  const speaking = run(fullTurn.slice(0, 3));
  assert.equal(agentReducer(speaking, { type: 'ASK', text: 'hola' }).turn, speaking.turn + 1);
  const failed = agentReducer(initialAgentState, { type: 'FAIL', message: 'x' });
  assert.equal(agentReducer(failed, { type: 'ASK', text: 'hola' }).status, THINKING);
  const listening = run(fullTurn.slice(0, 1));
  assert.equal(agentReducer(listening, { type: 'ASK', text: 'hola' }), listening);
});

test('normalizeText quita tildes y signos', () => {
  assert.equal(normalizeText('¿Qué ERES, Jarvis?'), 'que eres jarvis');
});

test('FAQ reconoce preguntas con y sin tildes', () => {
  assert.equal(matchIntent(script, '¿Qué eres?').id, 'what');
  assert.equal(matchIntent(script, 'que eres tu').id, 'what');
  assert.equal(matchIntent(script, 'Cómo entro al sistema').id, 'access');
  assert.equal(matchIntent(script, 'hola jarvis').id, 'greeting');
});

test('contraseñas nunca se procesan: respuesta de seguridad con prioridad', () => {
  const r = matchIntent(script, 'hola mi contraseña es 1234');
  assert.equal(r.id, 'password');
  assert.ok(!r.response.includes('1234'));
});

test('fuera de guion cae en fallback, sin inventar cifras ni clientes', () => {
  for (const q of ['cuánto cuesta el plan', 'cuántos clientes tienen', 'dame el MRR de este mes', '', '   ']) {
    const r = matchIntent(script, q);
    assert.equal(r.source, 'fallback', q);
    assert.equal(r.response, script.fallback);
  }
});

test('coincidencia por palabra completa, no por fragmento', () => {
  assert.equal(matchIntent(script, 'ahora mismo').source, 'fallback');
});

test('guion: todas las respuestas definidas y ids únicos', () => {
  const ids = script.faq.map((f) => f.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const f of script.faq) {
    assert.ok(f.response && f.trigger.length > 0, f.id);
  }
  assert.ok(script.intro.length > 0 && script.fallback);
});
