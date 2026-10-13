// 旧いアドレスに残った設定を、揺れ窓の「設定の読み込み」が読めるファイルにして書き出す。
//
// iPhone・iPad のホーム画面アプリは Safari と別の保存領域を持つので、新しいアドレスを開いても
// 設定は引き継がれない。旧いアプリはもう開けない（Service Worker を外して、この案内に替えた）ので、
// 旧いアイコンの保存領域に入れるのはこのページだけになる。
//
// 書式は揺れ窓（github.com/Ramilen-L-Emuruk/yuremado）の src/utils/settingsIo.ts に合わせている
// （buildSettingsFile・settingsFileName・SETTINGS_FILE_VERSION = 1・SETTINGS_FILE_APP = 'yuremado'）。
// あちらの書式を変えたら、ここも見直すこと。中身の検証は読み込む側（sanitize）が行う。
//
// 古い iOS でも構文エラーで止まらないよう、?? や引数なしの catch などは使っていない。

(function () {
  var button = document.querySelector('[data-export-settings]')
  if (!button) return
  var variant = button.getAttribute('data-export-settings') === 'dmdss' ? 'dmdss' : 'standard'
  var storageKey = variant === 'dmdss' ? 'quake-viewer-settings-dmdss' : 'quake-viewer-settings'

  // 写す項目。揺れ窓の sanitize({}) が返す項目名を 2026-10-14 に写したもの。
  // 保存された値を丸ごと写さないのは、知らない項目（過去の版の名残など）に秘密が入っていても
  // ファイルへ出さないため。API キーと到達予想トークンは、アプリの書き出しと同じく含めない。
  var KEYS = [
    'minDisplayScale', 'notifyMinScale', 'actionChecklistMinScale', 'soundEnabled', 'soundVolume',
    'nankaiCommentaryAlerts', 'uiScale', 'mapIconScale', 'hypocenterDepthScale', 'showBathymetry',
    'showActiveFaults', 'activeFaultOpacity', 'showQuakeHeatmap', 'showPlateBoundaries', 'showMapLegend',
    'mapLegendCollapsed', 'showDayNight', 'dayNightOpacity', 'defaultTab', 'tsunamiPriorityDefault',
    'tsunamiTitleTemporary', 'idleRevertSec', 'periodicReloadHours', 'recordingMode', 'notifyEEW',
    'notifyTsunami', 'notifyDetection', 'homeLat', 'homeLng', 'dmdataTestDelivery', 'voicevoxEnabled',
    'voicevoxUrl', 'voicevoxSpeakerId', 'ttsIntensityLevels', 'ttsMaxRegions', 'ttsAlwaysReadScale',
    'ttsRegionTolerance', 'ttsReadTelegramText', 'ttsTelegramTextBlocks', 'ttsTelegramBoilerplate',
    'ttsUnreceivedDetail', 'ttsMaxObservationPoints', 'ttsReadHypocenterDetail', 'ttsReadEewLpgmClass',
    'ttsReadEewWarningRegions', 'seismoEnabled', 'seismoHostUrl', 'seismoWave', 'seismoWaveCollapsedView',
    'seismoWaveExpanded', 'panelRatio',
  ]

  var stored = null
  try {
    var parsed = JSON.parse(localStorage.getItem(storageKey) || 'null')
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) stored = parsed
  } catch (e) {
    // 読めない値なら、書き出せるものは無い
  }
  // 設定が残っていない端末にはボタンを出さない（空の書き出しは役に立たない）
  if (!stored) return

  var settings = { dmdataApiKey: '', arrivalToken: '' }
  for (var i = 0; i < KEYS.length; i++) {
    if (Object.prototype.hasOwnProperty.call(stored, KEYS[i])) settings[KEYS[i]] = stored[KEYS[i]]
  }

  button.hidden = false
  button.addEventListener('click', function () {
    var now = new Date()
    var file = {
      app: 'yuremado',
      kind: 'settings',
      version: 1,
      variant: variant,
      exportedAt: now.toISOString(),
      settings: settings,
    }
    var text = JSON.stringify(file, null, 2)
    var name = fileStamp(now) + '_quake-viewer-settings-' + variant + '.json'

    // iPhone・iPad のホーム画面アプリでは、ダウンロードのリンクが何も起こさないことがある。
    // 共有シートにファイルを渡せるならそちらを先に使う（「"ファイル"に保存」で受けられる）。
    var shareFile = null
    try {
      shareFile = new File([text], name, { type: 'application/json' })
    } catch (e) {
      shareFile = null
    }
    if (shareFile && navigator.canShare && navigator.share && navigator.canShare({ files: [shareFile] })) {
      navigator.share({ files: [shareFile] }).catch(function (err) {
        // 利用者が共有シートを閉じただけなら、何もしない
        if (err && err.name === 'AbortError') return
        download(text, name)
      })
      return
    }
    download(text, name)
  })

  function download(text, name) {
    var url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
    var a = document.createElement('a')
    a.href = url
    a.download = name
    document.body.appendChild(a)
    a.click()
    a.remove()
    // すぐに解くと、保存の画面を出すブラウザで中身を読めなくなることがある
    setTimeout(function () { URL.revokeObjectURL(url) }, 60000)
  }

  // 揺れ窓の formatFileStamp と同じ形（20261014_093000+0900）
  function fileStamp(d) {
    function p(n, w) {
      var s = String(Math.floor(Math.abs(n)))
      while (s.length < (w || 2)) s = '0' + s
      return s
    }
    var off = -d.getTimezoneOffset()
    return p(d.getFullYear(), 4) + p(d.getMonth() + 1) + p(d.getDate()) + '_' +
      p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds()) +
      (off < 0 ? '-' : '+') + p(off / 60) + p(Math.abs(off) % 60)
  }
})()
