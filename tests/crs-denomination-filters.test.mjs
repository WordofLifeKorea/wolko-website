import test from 'node:test';
import assert from 'node:assert/strict';
import { DENOMINATION_FILTERS, denominationFamily } from '../public/crs-denomination-filters.js';

test('seven broad categories with English labels', () => {
  assert.deepEqual(DENOMINATION_FILTERS.map(g => g.ko), ['장로교','침례교','순복음','감리','성결교','성공회','독립교단']);
  assert.ok(DENOMINATION_FILTERS.every(g => g.en && /^[a-z-]+$/.test(g.id)));
});
test('detailed Presbyterian and Baptist values match their broad filter', () => {
  for (const value of ['기장 (기독교 장로회)', '예장고신 (예수교 장로회)', '예장합동', '예장합신', '예장백석', '예장통합', '장로회 / 장로교']) {
    assert.equal(denominationFamily(value), 'presbyterian');
  }
  for (const value of ['기침 (침례)', '성침 (침례)', '침례교', ' 침례 ']) assert.equal(denominationFamily(value), 'baptist');
});
test('remaining categories and unmatched denominations retain their stored values', () => {
  for (const [value, expected] of [['순복음','full-gospel'],['감리교','methodist'],['성공회','anglican'],['독립교단','independent'],['기성 (성결)','holiness'],['예성 (성결)','holiness'],['성결교','holiness'],['기타',null],['',null],[null,null]]) {
    const church = { denomination: value };
    assert.equal(denominationFamily(church.denomination), expected);
    assert.equal(church.denomination, value);
  }
});
