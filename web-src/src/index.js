/* 
* <license header>
*/

import regeneratorRuntime from 'regenerator-runtime'
import Runtime, { init } from '@adobe/exc-app'
import actions from './config.json'
import actionWebInvoke from './utils.js'
import assetsDataInit from "./assetsData.js";
import { PublicClientApplication } from './msal-browser-2.14.2.js';

let state = {}


/**
 * {
 * "assetID":"urn:aaid:aem:63fa8110-5591-429b-a562-982f8d6571c2",
 * "assetPath":"https://delivery-p49105-e258067.adobeaemcloud.com/adobe/assets/urn:aaid:aem:63fa8110-5591-429b-a562-982f8d6571c2/play?accept-experimental=1",
 * "metadata":{
 * "assetId":"urn:aaid:aem:63fa8110-5591-429b-a562-982f8d6571c2",
 * "assetMetadata":{
 * "dam:assetStatus":"approved"
 * },
 * "repositoryMetadata":{
 * "dc:format":"video/mp4",
 * "repo:createDate":"2024-02-27T08:57:55.560Z",
 * "repo:size":4439271
 * }
 * },
 * "pagePath":"/"
 * }
 *
 * {
 *     payload: {
 *         assetDetails: {
 *                        "urn:aaid:aem:63fa8110-5591-429b-a562-982f8d6571c2" : {
 *                                          assetUrl : "https://delivery-p49105-e258067.adobeaemcloud.com/adobe/assets/urn:aaid:aem:63fa8110-5591-429b-a562-982f8d6571c2/play?accept-experimental=1"
 *     metadata : {},
 *     pages :[
 *         {path: pagePath, tags: []},
 *         {path: pagePath, tags: []},
 *     ],
 *     expiryDate:
 *     mimeType:
 *     tags:
 *     isExpired:
 *     isAboutExpired:
 *     tagsMisMatched:
 *     },
 * "urn:aaid:aem:63fa8110-5591-429b-a562-982fjnaihscbiac" : {
 *
 * },
 * // assetDetails Concluded
 * },
 *
 * pageDetails: {
 *     "/":{
 *         totalAssets:number,
 *         tags:[],
 *         metadata:
 *         assets:[
 *             {
 *                 assetId :
 *                 tags:
 *                 expiry:
 *                 mimeTye:
 *             },
 *             {
 *                 assetId :
 *                 tags:
 *                 expiry:
 *                 mimeTye:
 *             },
 *         ]
 *     },
 *     "/abc":{}
 * },
 *
 * recommendation: {
 *     assetsToBeExpired
 * }
 *
 *
 *     }
 * }
 *
 *
 *
 *
 *
 *
 */



window.onload = async () => {
  /* Here you can bootstrap your application and configure the integration with the Adobe Experience Cloud Shell */
  try {
    // attempt to load the Experience Cloud Runtime
    require('./exc-runtime')
    // if there are no errors, bootstrap the app in the Experience Cloud Shell
    init(initRuntime)

    let state1 = await getState();

    const queryParams = new URLSearchParams(window.location.search);
    const hlxUrl = queryParams.get('hlxUrl');
    sessionStorage.setItem('hlxUrl', hlxUrl);
    sessionStorage.setItem('accessToken', state1.imsToken);
    await assetsDataInit();
  } catch (e) {
    console.log('application not running in Adobe Experience Cloud Shell')
    // fallback mode, run the application without the Experience Cloud Runtime
    let accessToken = sessionStorage.getItem('accessToken');
    if (!accessToken) {
      accessToken = await fetchAccessToken();
      console.log(accessToken);
      sessionStorage.setItem('accessToken', accessToken);
    } else {
      console.log('Access token found in session storage');
      console.log(accessToken);

    }
    // console.log(accessToken);
    // state1.imsToken = accessToken;
    let hlxUrl = sessionStorage.getItem('hlxUrl');
    if (!hlxUrl) {
        const queryParams = new URLSearchParams(window.location.search);
        hlxUrl = queryParams.get('hlxUrl');
        sessionStorage.setItem('hlxUrl', hlxUrl);
    }
    await assetsDataInit();
  }

   // await assetsDataInit(state);

}

async function fetchAccessToken () {
  const sp = {
    clientApp: {
      auth: {
        clientId: '2b4aa217-ddcd-4fe0-b09c-5a472764f552',
        authority: 'https://login.microsoftonline.com/fa7b1b5a-7b34-4387-94ae-d2c178decee1',
      },
    },
    login: {
      redirectUri: '/spauth.html',
    },
  };

  let accessToken;
  const publicClientApplication = new PublicClientApplication(sp.clientApp);
  const accounts = publicClientApplication.getAllAccounts();

  if (accounts.length === 0) {
    // User is not logged in, show the login popup
    await publicClientApplication.loginPopup(sp.login);

  }

  const account = publicClientApplication.getAllAccounts()[0];
  const accessTokenRequest = {
    scopes: ['files.readwrite', 'sites.readwrite.all'],
    account,
  };

  try {
    const res = await publicClientApplication.acquireTokenSilent(accessTokenRequest);
    accessToken = res.accessToken;
    return accessToken;
  } catch (error) {
    // Acquire token silent failure, and send an interactive request
    if (error.name === 'InteractionRequiredAuthError') {
      try {
        const res = await publicClientApplication.acquireTokenPopup(accessTokenRequest);
        accessToken = res.accessToken;
        console.log(accessToken);
        return accessToken;
      } catch (err) {
        console.error(`Cannot connect to SharePoint: ${err.message}`);
        document.body.removeChild(mask);
        document.querySelector('.assets-usage-report').style.display = 'block';
        return null; // Exit if token acquisition fails
      }
    } else {
      console.error('Error acquiring token silently:', error.message);
      document.body.removeChild(mask);
      document.querySelector('.assets-usage-report').style.display = 'block';
      return null;
    }
  }
}

/**
 * Initialize runtime and get IMS profile
 */
function initRuntime () {
  // get the Experience Cloud Runtime object
  const runtime = Runtime()
  // ready event brings in authentication/user info
  runtime.on('ready', ({ imsOrg, imsToken, imsProfile, locale }) => {
    // tell the exc-runtime object we are done
    runtime.done()
    state = { imsOrg, imsToken, imsProfile, locale }
    console.log('exc-app:ready')
  })
  // set solution info, shortTitle is used when window is too small to display full title
  runtime.solution = {
    icon: 'AdobeExperienceCloud',
    title: 'test-raw'
  }
  runtime.title = 'test-raw'
}

/**
 * Generate list of actions
 */
function showActionsList () {
  const container = document.getElementById('action-list')
  if (Object.keys(actions).length === 0) {
    container.innerHTML = '<span>you have no actions, run <code>aio app add actions</code> to add one</span>'
  } else {
    container.innerHTML = '<select id="selAction">' + Object.entries(actions).map(([actionName]) => `<option>${actionName}</option>`).join('') + '</select>'
  }
}
/**
 * Quick helper to safely call JSON.parse
 * @param {string} val
 */
function safeParse (val) {
  let result = null
  try {
    result = JSON.parse(val)
  } catch (e) { }
  return result
}

/**
 * Submit the form, and get a result back from the action
 */
function doSubmit () {
  const actionIndex = document.getElementById('selAction').selectedIndex || 0
  const taOutput = document.getElementById('taOutput')
  taOutput.innerHTML = 'calling action ...'
  if (actions) {
    const selAction = Object.entries(actions)[actionIndex]
    const headers = safeParse(document.getElementById('actionHeaders').value)
    const params = safeParse(document.getElementById('actionParams').value)
    // track the time to a result
    const preCallTime = Date.now()
    let outputHTML = ''
    invokeAction(selAction, headers, params)
      .then(actionResponse => {
        outputHTML = JSON.stringify(actionResponse, 0, 2)
      }).catch(err => {
        console.error('Error:', err)
        outputHTML = err.message
      }).finally(() => {
        taOutput.innerHTML = `time:${(Date.now() - preCallTime)}ms\n\n ${outputHTML}`
      })
  }
}

async function invokeAction (action, _headers, _params) {
  const headers = _headers || {}
  const params = _params || {}
  // all headers to lowercase
  Object.keys(headers).forEach((h) => {
    const lowercase = h.toLowerCase()
    if (lowercase !== h) {
      headers[lowercase] = headers[h]
      headers[h] = undefined
      delete headers[h]
    }
  })
  // set the authorization header and org from the ims props object
  if (state.imsToken && !headers.authorization) {
    headers.authorization = `Bearer ${state.imsToken}`
  }
  if (state.imsOrg && !headers['x-gw-ims-org-id']) {
    headers['x-gw-ims-org-id'] = state.imsOrg
  }
  // action is [name, url]
  const result = await actionWebInvoke(action[1], headers, params)
  return result
}
async function getState() {
  console.log('Getting state');
  let attempts = 0;
  while (!state.imsToken) {
    attempts++;
    console.log(`Attempt number: ${attempts}`);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return state;
}
