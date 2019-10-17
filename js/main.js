const graphql = `{
  repository(owner: "MOPCON", name: "MOPCON") {
    pullRequests(states: MERGED, first: 100, orderBy: {field: CREATED_AT, direction: DESC}) {
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
      totalCount
    }
  }
}
`;
const token = '';
axios({
  url: 'https://api.github.com/graphql',
  method: 'post',
  headers: {'Authorization': `token ${token}`},
  data: {
    query: graphql
  }
}).then((result) => {
  console.log(result.data)
});