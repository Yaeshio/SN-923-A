import { readFileSync } from 'fs';
import { resolve } from 'path';

// tests/fixtures/stl の実ファイル。どちらも同じ 10mm の立方体 (12 三角形) だが、バイト列は異なる。
export type StlFixture = 'cube-ascii.stl' | 'cube-binary.stl';

const FIXTURE_DIR = resolve(__dirname, '../fixtures/stl');

/** フィクスチャのバイト列。保存されたファイルとの完全一致の検証に使う。 */
export function readStlFixture(fixture: StlFixture): Buffer {
    return readFileSync(resolve(FIXTURE_DIR, fixture));
}

/** フィクスチャを、アップロード時の File にする。asName で、アップロードされたファイル名を変えられる。 */
export function loadStl(fixture: StlFixture, asName: string = fixture): File {
    return new File([new Uint8Array(readStlFixture(fixture))], asName, { type: 'model/stl' });
}
