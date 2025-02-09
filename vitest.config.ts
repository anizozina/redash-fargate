import { defineConfig } from 'vite';
import 'vitest/config';

export default defineConfig({
  test: {
    globals: true, // describeやtest, it, expectなどをimport無しで使えるようにする
    environment: 'node',
    include: ['./test/**/*.(test|spec).ts'], // 元のjestの設定が`test/`以下のファイルを参照する設定だったので合わせている
  },
});