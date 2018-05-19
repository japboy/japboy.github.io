import { setPassiveTouchGestures, setRootPath } from '@polymer/polymer/lib/utils/settings.js';

import { PageHome } from '@/components/pages/Home';

setPassiveTouchGestures(true);
setRootPath(window.MyAppGlobals.rootPath);

window.customElements.define('page-home', PageHome);
