import { initSettings } from './settings-common';
import { signOut } from './portal';
import { $ } from './dom';
initSettings().then((c) => {
  if (!c) return;
  $('#acct-line')!.textContent = `${c.session.user ?? 'brian'} on ${c.session.device ?? 'this device'}.`;
  $('#settings-signout')!.addEventListener('click', signOut);
});
