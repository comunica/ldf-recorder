import * as crypto from 'crypto';
import * as fs from 'fs';
import * as fse from 'fs-extra';
import * as nock from 'nock';
import * as Path from 'path';
import { HttpInterceptor } from '../lib/HttpInterceptor';

describe('HttpInterceptor', () => {

  beforeEach(() => {
    if (! fs.existsSync(jestTestFolder)) {
      fs.mkdirSync(jestTestFolder);
    }
  });

  const jestTestFolder: string = Path.join(process.cwd(), 'test', 'tmpfolder');

  const interceptor: HttpInterceptor = new HttpInterceptor({
    defaultDirectory: true, directory: jestTestFolder });

  describe('#interceptResponse', () => {

    const ct: string = 'application/trig;charset=utf-8';
    const fn: string = 'http://ex.org/path/';

    it('should have created a new file with a hash and content', () => {

      nock('http://ex.org')
      .defaultReplyHeaders({
        'Content-Type': ct,
      }).get('/path/').reply(200,
`@prefix : <http://ex.org/ex#>
:_ a :test`);

      interceptor.interceptResponse({
        headers: "", method: "GET", path: "/path/", port: undefined, protocol: "http:", hostname: "ex.org", query: "",
      }).then(() => {
        fs.readdir(jestTestFolder, (error, files) => {
          const filename: string = crypto.createHash('sha1')
                          .update(fn)
                          .digest('hex');
          const fileContent: string = fs.readFileSync(Path.join(jestTestFolder, filename), 'utf8');
          expect(fileContent.startsWith(`# Query: ${""}
# Hashed IRI: ${fn}
# Content-type: ${ct}`)).toBeTruthy();
          fse.removeSync(Path.join(jestTestFolder, filename));
        });
      });
    });

    it('should resolve', () => {

      nock('http://ex.org')
      .defaultReplyHeaders({
        'Content-Type': ct,
      }).get('/path/').reply(200,
`@prefix : <http://ex.org/ex#>
:_ a :test`);

      return expect(interceptor.interceptResponse({
        headers: "", method: "GET", path: "/path/", port: undefined, protocol: "http:", hostname: "ex.org", query: "",
      })).resolves.toBeUndefined();

    });

    it('should resolve when content-type is undefined', () => {

      nock('http://ex.org')
      .get('/path/').reply(200,
`@prefix : <http://ex.org/ex#>
:_ a :test`);

      return expect(interceptor.interceptResponse({
        headers: "", method: "GET", path: "/path/", port: undefined, protocol: "http:", hostname: "ex.org", query: "",
      })).resolves.toBeUndefined();

    });

    afterAll(() => {
      const filenamettl: string = crypto.createHash('sha1')
      .update(fn)
      .digest('hex');
      const filenametrig: string = crypto.createHash('sha1')
      .update(fn)
      .digest('hex');
      fse.removeSync(Path.join(jestTestFolder, filenametrig));
      fse.removeSync(Path.join(jestTestFolder, filenamettl));
    });

  });

});
