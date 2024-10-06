const defaultThumbnail = require('../no-image.png');
(async () => {
  // eslint-disable-next-line no-undef
  const queryParams = new URLSearchParams(window.location.search);
  const encodedJsonString = queryParams.get('data');
  const hlxUrl= queryParams.get('hlxUrl');
  let data = {};
  if (encodedJsonString) {
    const jsonString = decodeURIComponent(encodedJsonString);
    data = JSON.parse(jsonString);
  }
  init(data);

  function init(data) {
    // added a back button
    // eslint-disable-next-line no-undef
    const backButton = document.querySelector('.back-button');
    backButton.addEventListener('click', () => {
      // eslint-disable-next-line no-undef
      window.history.back();
    });
    const asset = data;
    //const asset = mockData.find(asset => asset.thumbnail === thumbnailUrl);
    const keysToShow = ['title', 'mimeType', 'usageCount', 'expirationDate', 'tags', 'status'];

    asset.title = asset.metadata.repositoryMetadata ? asset.metadata.repositoryMetadata['repo:name'] : 'NA';

    asset.status = asset.metadata.assetMetadata ? asset.metadata.assetMetadata['dam:assetStatus'] : 'NA';

    // add usageCount to asset object
    asset.usageCount = asset.pagePath.length

    // create a map of keystoShow and their display names
    const keyMap = {
      title: 'Title',
      mimeType: 'Mime Type',
      usageCount: 'Usage Count',
      expirationDate: 'Expiry Date',
      tags: 'Tags',
      status: 'Status'
    };

    if (asset) {
      if (!asset.isExpired)
        document.querySelector('.media-display').innerHTML = `<img src="${asset.assetPath}" alt="Thumbnail">`;
      else
        document.querySelector('.media-display').innerHTML = `<img src="${defaultThumbnail}" alt="Thumbnail">`;

      const metaDataSection = document.querySelector('.meta-data-section');
      keysToShow.forEach(key => {
        const metaDataCard = createMetaDataCard(keyMap[key], asset[key], asset.toBeExpired, asset.isExpired);
        if (metaDataCard) {
          metaDataCard.classList.add(key);
          metaDataSection.appendChild(metaDataCard);
        }
      });
      if(asset.status === 'approved') {
        metaDataSection.querySelector('.meta-data.status').classList.add('approved');
      }

      /* create a copy button on click the path should be copied to clip board
     */
      const copyButton = document.createElement('div')
      copyButton.classList.add('meta-data','copy-button');
      copyButton.textContent = 'Copy Asset';
      copyButton.addEventListener('click', () => {
            const path = asset.assetPath;
            navigator.clipboard.writeText(path);

            const message = document.createElement('div');
            message.classList.add('message', 'tooltip'); // Add 'tooltip' class for styling
            message.textContent = 'Path Copied!';
            copyButton.appendChild(message);
            // Start fade out after 5 seconds
            setTimeout(() => {
              message.style.opacity = '0';
              // Remove the message after the transition duration (0.5s)
              setTimeout(() => {
                message.remove();
              }, 500); // Match this duration with the CSS transition duration
            }, 1000);
          }
      );
      metaDataSection.appendChild(copyButton);
    }



    if (asset.pagePath) {
      const pagesSection = document.querySelector('.usage-section');
      let index = 1;
      asset.pagePath.forEach(page => {
        const pageDiv = document.createElement('div');
        pageDiv.classList.add('page');
        const linkDiv = document.createElement('div');
        linkDiv.classList.add('link');
        const pageLink = document.createElement('a');
        pageLink.href = hlxUrl+page;
        pageLink.textContent = `${index++}. `+hlxUrl+page;
        linkDiv.appendChild(pageLink);
        pageDiv.appendChild(linkDiv);
        if(asset.tagsMisMatchedPages.includes(page)){
          const mismatchedTag = document.createElement('div');
          mismatchedTag.classList.add('mismatched-tag');
          mismatchedTag.textContent = "Mismatched Tags";
          pageDiv.appendChild(mismatchedTag);
        }
        //create view-detail
        const viewDetail = document.createElement('div');
        viewDetail.classList.add('assets-usage');
        viewDetail.textContent = "Assets Usage Report";
        viewDetail.addEventListener('click', () => {
          window.location.href = `/assetsUsageReport.html?hlxUrl=${hlxUrl}&pagePath=${page}`;
        });
        pageDiv.appendChild(viewDetail);
        pagesSection.appendChild(pageDiv);
        fetch(`https://288650-edsassettracker-stage.adobeio-static.net/api/v1/web/EDS-Asset-Tracker1/fetchList?hlxUrl=${hlxUrl}`)
            .then(response => response.json())
            .then(data => {
              console.log(data.payload.pageDetails[page].tags);
              // create div and add tags to linkdiv
              const tagsDiv = document.createElement('div');
              tagsDiv.classList.add('tags');
              data.payload.pageDetails[page].tags.forEach(tag => {
                const tagDiv = document.createElement('div');
                tagDiv.textContent = tag;
                tagsDiv.appendChild(tagDiv);
              });
              linkDiv.appendChild(tagsDiv);
            });
      });
    }

    function createMetaDataCard(title, value, toBeExpired, isExpired) {
      const metaDataCard = document.createElement('div');
      metaDataCard.className = 'meta-data';
      let valueClass = 'value';
      if(title === 'Expiry Date' && value ) {
        if(toBeExpired)
          valueClass = 'value warning';
        if(isExpired)
          valueClass = 'value error';
      }
      if(value) {
        // if key is tags then value is an array of tags so create div for each tag
        if (title === 'Tags') {
          const tagsDiv = document.createElement('div');
          tagsDiv.className = 'tags';
          value.forEach(tag => {
            const tagDiv = document.createElement('div');
            tagDiv.textContent = tag;
            tagsDiv.appendChild(tagDiv);
          });
          metaDataCard.innerHTML = `
      <div class="title">${title}</div>
    `;
          metaDataCard.appendChild(tagsDiv);
        } else {
          metaDataCard.innerHTML = `
      <div class="title">${title}</div>
      <div class="${valueClass}">${value}</div>
  `;
        }
      }
      else
        return null;
      return metaDataCard;
    }
  }

})();

