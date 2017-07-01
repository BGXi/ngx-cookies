'use strict';

import {expect} from 'chai';
import {afterEach, beforeEach, describe, it} from 'mocha';
import {CookieOptions, Cookies} from '../src/index';

/**
 * @test {Cookies}
 */
describe('Cookies', () => {
  let backend = {
    _value: {},
    get cookie() {
      return Object.entries(this._value).map(([key, value]) => `${key}=${value}`).join(';');
    },
    set cookie(value) {
      let offset = value.indexOf('=');
      let key = value.substr(0, offset);
      this._value[key] = value.substr(offset + 1);
    }
  };

  let options;
  beforeEach('reset the cookie backend', () => {
    backend._value = {};
    options = new CookieOptions;
  });

  /**
   * @test {Cookies#keys}
   */
  describe('#keys', () => {
    it('should return an empty array if the current document has no associated cookie', () => {
      expect(new Cookies(options, backend).keys).to.be.an('array').that.is.empty;
    });

    it('should return the keys of the cookies associated with the current document', () => {
      backend.cookie = 'foo=bar';
      backend.cookie = 'bar=baz';

      let keys = new Cookies(options, backend).keys;
      expect(keys).to.be.an('array').and.have.lengthOf(2);
      expect(keys[0]).to.equal('foo');
      expect(keys[1]).to.equal('bar');
    });
  });

  /**
   * @test {Cookies#length}
   */
  describe('#length', () => {
    it('should return zero if the current document has no associated cookie', () => {
      expect(new Cookies(options, backend)).to.have.lengthOf(0);
    });

    it('should return the number of cookies associated with the current document', () => {
      backend.cookie = 'foo=bar';
      backend.cookie = 'bar=baz';
      expect(new Cookies(options, backend)).to.have.lengthOf(2);
    });
  });

  /**
   * @test {Cookies#onChanges}
   */
  describe('#onChanges', () => {
    let subscription;
    afterEach('cancel the subscription', () =>
      subscription.unsubscribe()
    );

    it('should trigger an event when a cookie is added', done => {
      let cookies = new Cookies(options, backend);
      subscription = cookies.onChanges.subscribe(changes => {
        expect(changes).to.be.an('array').and.have.lengthOf(1);

        let record = changes[0];
        expect(record).to.be.an('object');
        expect(record).to.have.property('key').that.equal('foo');
        expect(record).to.have.property('currentValue').that.equal('bar');
        expect(record).to.have.property('previousValue').that.is.null;

        done();
      });

      cookies.set('foo', 'bar');
    });

    it('should trigger an event when a cookie is updated', done => {
      backend.cookie = 'foo=bar';

      let cookies = new Cookies(options, backend);
      subscription = cookies.onChanges.subscribe(changes => {
        expect(changes).to.be.an('array').and.have.lengthOf(1);

        let record = changes[0];
        expect(record).to.be.an('object');
        expect(record).to.have.property('key').that.equal('foo');
        expect(record).to.have.property('currentValue').that.equal('baz');
        expect(record).to.have.property('previousValue').that.equal('bar');

        done();
      });

      cookies.set('foo', 'baz');
    });

    it('should trigger an event when a cookie is removed', done => {
      backend.cookie = 'foo=bar';

      let cookies = new Cookies(options, backend);
      subscription = cookies.onChanges.subscribe(changes => {
        expect(changes).to.be.an('array').and.have.lengthOf(1);

        let record = changes[0];
        expect(record).to.be.an('object');
        expect(record).to.have.property('key').that.equal('foo');
        expect(record).to.have.property('currentValue').that.is.null;
        expect(record).to.have.property('previousValue').that.equal('bar');

        done();
      });

      cookies.remove('foo');
    });

    it('should trigger an event when all the cookies are removed', done => {
      backend.cookie = 'foo=bar';
      backend.cookie = 'bar=baz';

      let cookies = new Cookies(options, backend);
      subscription = cookies.onChanges.subscribe(changes => {
        expect(changes).to.be.an('array').and.have.lengthOf(2);

        let record = changes[0];
        expect(record).to.be.an('object');
        expect(record).to.have.property('key').that.equal('foo');
        expect(record).to.have.property('currentValue').that.is.null;
        expect(record).to.have.property('previousValue').that.equal('bar');

        record = changes[1];
        expect(record).to.be.an('object');
        expect(record).to.have.property('key').that.equal('bar');
        expect(record).to.have.property('currentValue').that.is.null;
        expect(record).to.have.property('previousValue').that.equal('baz');

        done();
      });

      cookies.clear();
    });
  });

  /**
   * @test {Cookies#Symbol.iterator}
   */
  describe('#[Symbol.iterator]()', () => {
    it('should return a done iterator if the current document has no associated cookie', () => {
      let cookies = new Cookies(options, backend);
      let iterator = cookies[Symbol.iterator]();
      expect(iterator.next().done).to.be.true;
    });

    it('should return a value iterator if the current document has associated cookies', () => {
      let cookies = new Cookies(options, backend);
      backend.cookie = 'foo=bar';
      backend.cookie = 'bar=baz';

      let iterator = cookies[Symbol.iterator]();
      let next = iterator.next();
      expect(next.done).to.be.false;
      expect(next.value).to.be.an('array');
      expect(next.value[0]).to.equal('foo');
      expect(next.value[1]).to.equal('bar');

      next = iterator.next();
      expect(next.done).to.be.false;
      expect(next.value[0]).to.equal('bar');
      expect(next.value[1]).to.equal('baz');
      expect(iterator.next().done).to.be.true;
    });
  });

  /**
   * @test {Cookies#clear}
   */
  describe('#clear()', () => {
    it('should remove all the cookies associated with the current document', () => {
      backend.cookie = 'foo=bar';
      backend.cookie = 'bar=baz';

      let cookies = new Cookies(options, backend);
      cookies.clear();
      expect(backend.cookie).to.contain('foo=; expires=Thu, 01 Jan 1970 00:00:00 GMT');
      expect(backend.cookie).to.contain('bar=; expires=Thu, 01 Jan 1970 00:00:00 GMT');
    });
  });

  /**
   * @test {Cookies#get}
   */
  describe('#get()', () => {
    it('should properly get the cookies associated with the current document', () => {
      let cookies = new Cookies(options, backend);
      expect(cookies.get('foo')).to.be.null;
      expect(cookies.get('foo', '123')).to.equal('123');

      backend.cookie = 'foo=bar';
      expect(cookies.get('foo')).to.equal('bar');

      backend.cookie = 'foo=123';
      expect(cookies.get('foo')).to.equal('123');
    });
  });

  /**
   * @test {Cookies#getObject}
   */
  describe('#getObject()', () => {
    it('should properly get the deserialized cookies associated with the current document', () => {
      let cookies = new Cookies(options, backend);
      expect(cookies.getObject('foo')).to.be.null;
      expect(cookies.getObject('foo', {key: 'value'})).to.deep.equal({key: 'value'});

      backend.cookie = 'foo=123';
      expect(cookies.getObject('foo')).to.equal(123);

      backend.cookie = 'foo=%22bar%22';
      expect(cookies.getObject('foo')).to.equal('bar');

      backend.cookie = 'foo=%7B%22key%22%3A%22value%22%7D';
      expect(cookies.getObject('foo')).to.be.an('object')
        .and.have.property('key').that.equal('value');
    });

    it('should return the default value if the value can\'t be deserialized', () => {
      let cookies = new Cookies(options, backend);
      backend.cookie = 'foo=bar';
      expect(cookies.getObject('foo', 'defaultValue')).to.equal('defaultValue');
    });
  });

  /**
   * @test {Cookies#has}
   */
  describe('#has()', () => {
    it('should return `false` if the current document has an associated cookie with the specified key', () => {
      expect(new Cookies(options, backend).has('foo')).to.be.false;
    });

    it('should return `true` if the current document does not have an associated cookie with the specified key', () => {
      backend.cookie = 'foo=bar';

      let cookies = new Cookies(options, backend);
      expect(cookies.has('foo')).to.be.true;
      expect(cookies.has('bar')).to.be.false;
    });
  });

  /**
   * @test {Cookies#remove}
   */
  describe('#remove()', () => {
    it('should properly remove the cookies associated with the current document', () => {
      backend.cookie = 'foo=bar';
      backend.cookie = 'bar=baz';

      let cookies = new Cookies(options, backend);
      cookies.remove('foo');
      expect(backend.cookie).to.contain('foo=; expires=Thu, 01 Jan 1970 00:00:00 GMT');
      expect(backend.cookie).to.contain('bar=baz');

      cookies.remove('bar');
      expect(backend.cookie).to.contain('bar=; expires=Thu, 01 Jan 1970 00:00:00 GMT');
    });
  });

  /**
   * @test {Cookies#set}
   */
  describe('#set()', () => {
    it('should properly set the cookies associated with the current document', () => {
      let cookies = new Cookies(options, backend);
      expect(backend.cookie).to.not.contain('foo');

      cookies.set('foo', 'bar');
      expect(backend.cookie).to.contain('foo=bar');

      cookies.set('foo', '123');
      expect(backend.cookie).to.contain('foo=123');
    });
  });

  /**
   * @test {Cookies#setObject}
   */
  describe('#setObject()', () => {
    it('should properly serialize and set the cookies associated with the current document', () => {
      let cookies = new Cookies(options, backend);
      expect(backend.cookie).to.not.contain('foo');

      cookies.setObject('foo', 123);
      expect(backend.cookie).to.contain('foo=123');

      cookies.setObject('foo', 'bar');
      expect(backend.cookie).to.contain('foo=%22bar%22');

      cookies.setObject('foo', {key: 'value'});
      expect(backend.cookie).to.contain('foo=%7B%22key%22%3A%22value%22%7D');
    });
  });
});