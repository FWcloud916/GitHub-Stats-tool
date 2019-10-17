const graphql = (owner, name, cursor) => {
  let after = cursor !== '' ? `, after: "${cursor}"` : '';
  return `{
    repository(owner: ${owner}, name: ${name}) {
      pullRequests(states: MERGED, first: 100, orderBy: {field: CREATED_AT, direction: DESC}, ${after}) {
        nodes {
          author {
            login
          }
          createdAt
          updatedAt
          url
          commits(first: 100) {
            nodes {
              commit {
                additions
                deletions
                changedFiles
              }
            }
            totalCount
          }
          comments(first: 1) {
            totalCount
          }
          reviews(first: 1) {
            totalCount
          }
        }
        pageInfo {
          endCursor
          startCursor
          hasNextPage
        }
      }
    }
  }`;
}

const stats = () => {
  return {
    'comments': 0,
    'reviews': 0,
    'contributors': {},
    'codeChange': {
      'additions': 0,
      'deletions': 0,
      'changedFiles': 0
    },
    'pullRequestTotal': 0
  };
}

let year = Date.parse('2019');
const dateSelect = document.getElementById('selectDate');
dateSelect.addEventListener('change', function () {
  year = Date.parse(this.value);
})

const getdata = (owner = '', name = '', cursor = '', lastStats = stats()) => {
  let inputOwner = `"${owner}"`;
  let inputName = `"${name}"`;
  axios({
    url: 'https://api.github.com/graphql',
    method: 'post',
    headers: { 'Authorization': `token ${github.token}` },
    data: {
      query: graphql(inputOwner, inputName, cursor)
    }
  }).then((result) => {
    console.log(result.data)
    const dataset = result.data.data.repository.pullRequests;
    const statsResult = statsCollect(dataset, lastStats);
    
    if (!statsResult.finish && statsResult.data.pageInfo.hasNextPage) {
      getdata(owner, name, statsResult.data.pageInfo.endCursor, statsResult.data.stats)
    } else {
      // 統計
      const statsData = statsResult.data.stats;
      document.querySelector('#displayResData h5').textContent = name;
      let data = '';
      Object.keys(statsData).forEach(key => {
        console.log(statsData[key])
        if (typeof statsData[key] != 'object') {
          data += ` <h5 class="card-title">${key}</h5>
          <p class="card-text">${statsData[key]}</p>`
        } else if (key == 'codeChange') {
          let tempData = '';
          const originData = statsData[key];
          Object.keys(originData).forEach(key => {
            tempData += `<p class="card-text">${key}<span>: ${originData[key]}</span></p>`
          })
          data += ` <h5 class="card-title">${key}</h5>${tempData}`
        } else if (key == 'contributors') {
          let tempData = '';
          const originData = statsData[key];
          Object.keys(originData).forEach(key => {
            tempData += `<div class="card mt-2 mr-2" style="width: 18rem;">
             <div class="card-body">
              <h6 class="card-text">${key}</h6>
              <p class="card-text">pullRequestTotal: ${originData[key].pullRequestTotal}</p>
              <p class="card-text">codeChange: <br>
              additions: ${originData[key].codeChange.additions} <br>
              changedFiles: ${originData[key].codeChange.changedFiles} <br>
              deletions: ${originData[key].codeChange.deletions} <br>
              </p>
              </div>
            </div>`;
          })
          data += `<h5 class="card-title">${key}</h5><div class="d-flex flex-wrap">${tempData}</div>`
        }
      });
      document.getElementById('resDataBody').innerHTML = data;
    }
  });
}

function statsCollect(dataset, lastStats = stats()) {
  let finish = false;
  let pageInfo = dataset.pageInfo;
  const statsCollect = Object.assign({}, lastStats);
  const subset = dataset.nodes;
  subset.forEach((d) => {
    if (Date.parse(d.createdAt) > year) {
      if (typeof (statsCollect.contributors[d.author.login]) == 'undefined') {
        statsCollect.contributors[d.author.login] = 0;
        statsCollect.contributors[d.author.login] = {
          'pullRequestTotal': 0,
          'codeChange': {
            'additions': 0,
            'deletions': 0,
            'changedFiles': 0
          },
        };
      }
      statsCollect.contributors[d.author.login].pullRequestTotal += 1;
      let commits = d.commits.nodes;
      commits.forEach((commitSet) => {
        statsCollect.codeChange.additions += commitSet.commit.additions
        statsCollect.codeChange.deletions += commitSet.commit.deletions
        statsCollect.codeChange.changedFiles += commitSet.commit.changedFiles
        statsCollect.contributors[d.author.login].codeChange.additions += commitSet.commit.additions;
        statsCollect.contributors[d.author.login].codeChange.deletions += commitSet.commit.deletions;
        statsCollect.contributors[d.author.login].codeChange.changedFiles += commitSet.commit.changedFiles;
      })
      statsCollect.comments += d.comments.totalCount;
      statsCollect.reviews += d.reviews.totalCount;
      statsCollect.pullRequestTotal++;
    } else {
      finish = true;
    }
    if (!pageInfo.hasNextPage) {
      finish = true;
    }
  })
  return { 'finish': finish, data: { 'stats': statsCollect, 'pageInfo': pageInfo } };
}

const github = {
  'url': 'https://api.github.com/graphql',
  'token': '',
  'login': () => {
    const token = document.getElementById('token').value;
    axios({
      url: github.url,
      method: 'post',
      headers: { 'Authorization': `token ${token}` },
      data: {
        query: `{
                  viewer{
                    repositories(first:100) {
                      nodes{
                        nameWithOwner
                      }
                    }
                  }
                }`
      }
    }).then((res) => {
      github.token = token;
      console.log(res.data.data);
      res.data.data.viewer.repositories.nodes.forEach(element => {
        console.log();
        const option = document.createElement("option");
        option.text = element.nameWithOwner;
        option.value = element.nameWithOwner;
        const select = document.getElementById("selectRes");
        select.appendChild(option);
      });
      const sendRes = document.getElementById("sendRes");
      sendRes.addEventListener('click', selectData);
      sendRes.disabled = false;
    }).catch(function (error) {
      console.log(error);
    })
  }
}

function selectData() {
  const repo = document.getElementById("selectRes").value;
  const transData = repo.split('/');
  getdata(transData[0], transData[1]);
}
