import { PublicClientApplication } from './msal-browser-2.14.2.js';
import excApp, { init } from '@adobe/exc-app';

import { getState } from './index.js';

var defaultThumbnail = require('../no-image.png');
let accessToken;

(async () => {

  // Create mask and spinner elements
  const mask = document.createElement('div');
  mask.className = 'mask';
  const spinner = document.createElement('div');
  spinner.className = 'spinner';
  mask.appendChild(spinner);
  const loadingText = document.createElement('div');
  loadingText.textContent = 'Generating Assets Usage Report...';
  loadingText.className = 'loading-text';
  mask.appendChild(loadingText);
  document.body.appendChild(mask);

  const queryParams = new URLSearchParams(window.location.search);
  const hlxUrl = queryParams.get('hlxUrl');
  const pagePath = queryParams.get('pagePath');
  let data = {};
  async function connectAndFetchData() {

    try {
      let state = await getState();
      accessToken = state.imsToken;

    } catch (error) {
      console.log(error);
    }

    // Proceed if we have a valid access token
    if (accessToken) {
      try {
        const response = await fetch(
            `https://288650-edsassettracker.adobeio-static.net/api/v1/web/EDS-Asset-Tracker1/fetchList?hlxUrl=${hlxUrl}`,
            {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${accessToken}`, // Send the access token in the Authorization header
                'Content-Type': 'application/json'
              }
            }
        );
        data = await response.json();
      } catch (error) {
        console.error('Failed to fetch data:', error);
        alert('Failed to fetch asset data.');
      } finally {
        // Remove the mask and spinner once data is fetched or an error occurs
        document.body.removeChild(mask);
        document.querySelector('.assets-usage-report').style.display = 'block';
      }
    }
  }

  await connectAndFetchData();
  init(data);

  function init(data) {
    const response = data;

    const insightsContainer = document.getElementById('assets-insights');

    const assetsFlexContainer = document.querySelector('.assets-flex-container');

    let topUsage = 0;
    let topUsed = '';
    let insights = [];
    let expiredAssets = 0;
    let aboutToExpireAssets = 0;
    let tagsMisMatchedAssets = 0;
    // if pagePath is given then filter the response.payload.assetDetails into a new json object have filter out those entry which doesn't have pagePath in it
    if (pagePath) {
      document.querySelector('.assets-title').textContent = 'Page Assets Usage Report';
      const filteredAssetDetails = {};
      Object.entries(response.payload.assetDetails).forEach(([urn, asset]) => {
        if (asset.pagePath.includes(pagePath)) {
          filteredAssetDetails[urn] = asset;
        }
      });
      response.payload.assetDetails = filteredAssetDetails;
      // before page-filter add a div to return to all assets
      const allAssetsDiv = document.getElementById('all-asset-usage-report');
      allAssetsDiv.classList.add('all-asset-usage-report');
      allAssetsDiv.textContent = '< Back to site assets usage report';
      allAssetsDiv.addEventListener('click', () => {
        window.location.href = `/assetsUsageReport.html?hlxUrl=${hlxUrl}`;
      });
      const pageFilter = document.querySelector('.page-filter');
      pageFilter.classList.remove('all');
      // get last part of the pagePath and replace - and _ with space
      const pagePathParts = pagePath.split('/');
      pageFilter.innerHTML = `<div class='title'> Page Details</div></div><div><div style='font-size: 14px; font-weight: 600' >Page Path</div><a href='${hlxUrl}${pagePath}' target='_blank'>${pagePathParts[pagePathParts.length - 1].replace(/-/g, ' ').replace(/_/g, ' ')}</a></div>`;
      //pageFilter.innerHTML = `<div><div style='font-size: 14px; font-weight: 600' >Page Path</div><a href='${hlxUrl}${pagePath}' target='_blank'>${hlxUrl}${pagePath}</a></div>`;
      const parentDiv = document.createElement('div');
      parentDiv.innerHTML = `<div style='font-size: 14px; font-weight: 600; padding-bottom: 4px;' >Tags</div>`;
      const tagsDiv = document.createElement('div');
      tagsDiv.className = 'list-tags';

      response.payload.pageDetails[pagePath].tags.forEach(tag => {
        const tagDiv = document.createElement('div');
        tagDiv.className = 'tags';
        tagDiv.textContent = tag
        tagsDiv.appendChild(tagDiv);
      });
      parentDiv.appendChild(tagsDiv);
      pageFilter.appendChild(parentDiv);
    }

    Object.entries(response.payload.assetDetails).forEach(([urn, asset]) => {
      const assetRow = document.createElement('div');
      assetRow.className = 'asset-row';
      // Define the keys to show in the UI
      const keysToShow = ['thumbnail', 'title', 'type', 'usageCount', 'actions'];
      const url = new URL(asset.assetPath);
      const cleanUrl = `${url.protocol}//${url.host}${url.pathname}`;

      // create actions array on the base of isExpired , isAboutExpired and tagsMisMatched
      asset.actions = [];
      if (asset.isExpired) {
        asset.actions.push('Error: Asset is expired');
        expiredAssets += 1;
      }
      if (asset.toBeExpired) {
        asset.actions.push('Warning: Asset is about to expire');
        aboutToExpireAssets += 1;
      }
      if (pagePath) {
        if(asset.tagsMisMatchedPages.includes(pagePath)) {
          asset.actions.push(`Compliance issue: Tags mismatched`);
          tagsMisMatchedAssets += 1;
        }
      }
      else if (asset.tagsMisMatchedPages.length > 0) {
        asset.actions.push(`Compliance issue (${asset.tagsMisMatchedPages.length}): Tags mismatched`);
        tagsMisMatchedAssets += 1;
      }

      if(asset.actions.length === 0) {
        asset.actions.push('No action item');
      }

      const assetTitle  = asset.metadata.repositoryMetadata ? asset.metadata.repositoryMetadata['repo:name'] : 'NA';
      // Convert asset details into an array of [key, value] pairs
      const assetEntries = Object.entries({
        thumbnail: cleanUrl, // Assuming assetUrl is the thumbnail URL
        title: assetTitle,
        type: asset.mimeType,
        usageCount: asset.pagePath.length,
        actions: asset.actions // Assuming actions is an array of action strings
      });
      // Iterate over each [key, value] pair
      assetEntries.forEach(([key, value]) => {
        if (keysToShow.includes(key)) {
          const assetData = document.createElement('div');
          assetData.className = 'asset-data';
          if (key === 'thumbnail') {
            const img = document.createElement('img');
            img.classList.add('thumbnail');
            if(!asset.isExpired) {
              img.src = value;
              img.alt = 'Thumbnail';
            }
            else {
              img.src = defaultThumbnail;
            }
            assetData.appendChild(img);
          } else if (key === 'actions') {
            const ul = document.createElement('ul');
            value.forEach(action => {
              const li = document.createElement('li');
              if (action.includes('Warning') || action.includes('Compliance')) {
                li.classList.add('warning');
              }
              else if (action.includes('Error')){
                li.classList.add('error');
              }
              else {
                li.classList.add('no-action-item');
              }
              li.textContent = action;
              ul.appendChild(li);
            });
            assetData.classList.add('actions');
            assetData.appendChild(ul);
          } else {
            assetData.textContent = value;
          }
          assetRow.appendChild(assetData);
        }
      });
      const detailLinkDiv = document.createElement('div');
      detailLinkDiv.classList.add('asset-detail-link', 'asset-data');
      const detailLink = document.createElement('a');
      detailLink.textContent = 'View Details';
      const jsonString = JSON.stringify(asset);
      const encodedJsonString = encodeURIComponent(jsonString);
      // Use URN in the query string to identify the asset in the details page
      detailLink.href = `/assetDetails.html?data=${encodedJsonString}&hlxUrl=${hlxUrl}`;
      if (asset.pagePath.length > topUsage) {
        topUsage = asset.pagePath.length;
        topUsed = `/assetDetails.html?data=${encodedJsonString}&hlxUrl=${hlxUrl}`;
      }
      detailLinkDiv.appendChild(detailLink);
      assetRow.appendChild(detailLinkDiv);
      assetsFlexContainer.appendChild(assetRow);
    });


    const toggleViewBtn = document.getElementById('toggleViewBtn');
    const cardViewContainer = document.querySelector('.card-view-container');
    let isListView = true;

    toggleViewBtn.addEventListener('click', () => {
      isListView = !isListView;
      toggleViewBtn.innerText = isListView ? 'Card View' : 'List View';
      if (!isListView) {
        toggleViewBtn.classList.remove('card-view');
        toggleViewBtn.classList.add('list-view');
      } else {
        toggleViewBtn.classList.remove('list-view');
        toggleViewBtn.classList.add('card-view');
      }
      assetsFlexContainer.style.display = isListView ? '' : 'none';
      cardViewContainer.style.display = isListView ? 'none' : 'flex';
      if (!isListView) {
        populateCardView();
      }
    });

    function getActionClass(action) {
      if (action.includes('Warning') || action.includes('Compliance')) {
        return 'warning';
      }
      else if (action.includes('Error')){
        return 'error';
      }
      else {
        return 'no-action-item';
      }
    }

    function populateCardView() {
      cardViewContainer.innerHTML = ''; // Clear existing cards
      Object.entries(response.payload.assetDetails).forEach(([urn, asset]) => {
        const card = document.createElement('div');
        card.className = 'card';
        const jsonString = JSON.stringify(asset);
        const encodedJsonString = encodeURIComponent(jsonString);
        // Use URN in the query string to identify the asset in the details page
        const href = `/assetDetails.html?data=${encodedJsonString}&hlxUrl=${hlxUrl}`;
        const cleanThumbnailUrl = new URL(asset.assetPath);
        let thumbnail;
        if (!asset.isExpired)
          thumbnail = `${cleanThumbnailUrl.protocol}//${cleanThumbnailUrl.host}${cleanThumbnailUrl.pathname}`;
        else
          thumbnail = defaultThumbnail;
        const assetTitle  = asset.metadata.repositoryMetadata ? asset.metadata.repositoryMetadata['repo:name'] : 'NA';
        card.innerHTML = `
            <img src="${thumbnail}" alt="Thumbnail">
            <div class="title">${assetTitle}</div>
            <div class="usage">Usage: ${asset.pagePath.length}</div>
            <div class="action">Actions: 
                <ul>${asset.actions.map(action => `<li class=${getActionClass(action)}>${action}</li>`).join('')}</ul>
            </div>
            <div class="view-details">
                <a href=${href}>View Details</a>
            </div>
        `;
        cardViewContainer.appendChild(card);
      });
    }

    // add insights to asset object
    // Create a button element

    const totalAssets = document.createElement('div');
    totalAssets.classList.add('total-assets');
    totalAssets.textContent = `Total Assets: ${Object.keys(response.payload.assetDetails).length}`;
    insightsContainer.appendChild(totalAssets);
    Object.keys(response.payload.assetDetails).length;

    const topUsedButton = document.createElement('div');
    topUsedButton.classList.add('top-used-button','insight-item');
    topUsedButton.textContent = 'Top Used Asset';
    // Add an event listener to handle the click event
    topUsedButton.addEventListener('click', () => {
      window.location.href = topUsed; // Navigate to the top used asset page
    });
    // Append the button to the insights container or any other relevant container
    insightsContainer.appendChild(topUsedButton);
    insights.push(`Expired : ${expiredAssets}`);
    insights.push(`About to Expire : ${aboutToExpireAssets}`);
    insights.push(`Non compliant : ${tagsMisMatchedAssets}`);
    insights.forEach(insight => {
      const insightElement = document.createElement('div');
      insightElement.className = 'insight-item';
      insightElement.innerHTML = insight;
      insightsContainer.appendChild(insightElement);
    });

    // Initialize a global object to track sorting orders
    const sortingOrders = {
      title: 'ascending',
      usage: 'ascending',
      expiration: 'ascending'
    };

    function sortAssets(attribute) {
      console.log(`Sorting by ${attribute}, current order: ${sortingOrders[attribute]}`);
      const assetsContainer = document.querySelector('.assets-flex-container');
      let assetRows = Array.from(assetsContainer.getElementsByClassName('asset-row')).slice(1); // Exclude header row

      assetRows.sort((a, b) => {
        let aValue, bValue;
        switch (attribute) {
          case 'title':
            aValue = a.children[1].textContent.toLowerCase();
            bValue = b.children[1].textContent.toLowerCase();
            break;
          case 'usage':
            aValue = parseInt(a.children[3].textContent);
            bValue = parseInt(b.children[3].textContent);
            break;
          default:
            return 0;
        }
        return sortingOrders[attribute] === 'ascending' ? (aValue > bValue ? 1 : -1) : (aValue < bValue ? 1 : -1);
      });

      sortingOrders[attribute] = sortingOrders[attribute] === 'ascending' ? 'descending' : 'ascending';
      console.log(`New order for ${attribute}: ${sortingOrders[attribute]}`);

      // Remove existing rows and append sorted rows
      assetRows.forEach(row => assetsContainer.removeChild(row));
      assetRows.forEach(row => assetsContainer.appendChild(row));
    }

// Event listeners remain the same
    document.getElementById('sortTitle').addEventListener('click', () => sortAssets('title'));
    document.getElementById('sortUsage').addEventListener('click', () => sortAssets('usage'));

  }

})();
