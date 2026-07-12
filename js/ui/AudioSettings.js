/**
 * AudioSettings — เชื่อม SettingsStore → ระบบเสียง (Sfx/AudioBus)
 *
 * เฟส 0: ทำให้ค่าตั้งค่าขับเสียงจริง โดยไม่ผูก Sfx เข้ากับ SettingsStore ตรงๆ
 * `audio` เป็นอะไรก็ได้ที่มี setMuted/setSfxVolume/setMusicVolume (เทสได้ด้วย fake object)
 * @param {{setMuted?:Function,setSfxVolume?:Function,setMusicVolume?:Function}} audio
 * @param {import('../systems/SettingsStore.js').SettingsStore} settings
 * @returns {() => void} unsubscribe
 */
export function applyAudioSettings(audio, settings) {
  const apply = () => {
    if (audio.setMuted) audio.setMuted(!settings.get('sound'));
    if (audio.setSfxVolume) audio.setSfxVolume(settings.get('sfxVol'));
    if (audio.setMusicVolume) audio.setMusicVolume(settings.get('music') ? settings.get('musicVol') : 0);
  };
  apply();
  const keys = new Set(['sound', 'sfxVol', 'music', 'musicVol', 'ambient', '*']);
  return settings.subscribe((k) => { if (keys.has(k)) apply(); });
}
