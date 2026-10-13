// 揺れ窓は /yuremado/ へ移った。旧いアドレスの端末に残った Service Worker を外す。
//
// 旧い Service Worker は更新を確かめるたびにこのファイルを取りに来る。中身が違うので
// 入れ替わり、次のことをして消える。
//   1. このアドレスのキャッシュを消す（新しいアドレスのキャッシュは消さない）
//   2. 自分の登録を外す
//   3. 開いている画面を読み込み直す（キャッシュではなく、ネットワークの案内のページが出る）
//
// standard 版（/realtime-earthquake-viewer/）と DMDSS 版（/realtime-earthquake-viewer/dmdss/）で
// 同じ中身を置いている。範囲はそれぞれの登録から取るので、書き分けは要らない。

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(retire())
})

async function retire() {
  const scope = self.registration.scope

  // キャッシュは同じオリジンで共有されていて、新しいアドレスのものも並ぶ。
  // Workbox はキャッシュ名の末尾に登録の範囲（URL）を付ける（workbox-precache-v2-<範囲>）ので、
  // それで自分のものだけを選ぶ。部分一致にしないのは、standard 版の範囲が DMDSS 版の範囲の
  // 先頭と一致し、DMDSS 版のキャッシュまで巻き込むため（あちらは自分の sw.js で片付く）。
  // 名前に範囲を持たないキャッシュ（`p2pquake-history` など）は新しいアドレスでも
  // 同じ名前で使っているので触らない。
  const names = await caches.keys()
  await Promise.all(names.filter((name) => name.endsWith(scope)).map((name) => caches.delete(name)))

  // 画面を握るのは、自分が登録を外す前に済ませる（外した後でも動くが、順序に頼らない）
  await self.clients.claim()
  await self.registration.unregister()

  const windows = await self.clients.matchAll({ type: 'window' })
  await Promise.all(
    windows.map((client) =>
      client.navigate(client.url).catch(() => {
        // 読み込み直せなくても、登録は外れている。次に開いたときに案内が出る
      }),
    ),
  )
}
