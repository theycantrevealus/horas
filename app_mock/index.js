const jsonServer = require('json-server')
const path = require('path')
const server = jsonServer.create()
const router = jsonServer.router(path.join(__dirname, 'db.json'))
const middlewares = jsonServer.defaults()

server.use(middlewares)

server.post('/v1/account/signin', (req, res) => {
  res.jsonp({
    statusCode: {
      defaultCode: 200,
      customCode: 'S0000',
      classCode: 'ACC'
    },
    message: 'Sign in success',
    payload: require('./signinv2.json'),
    transaction_classify: '',
    transaction_id: null
  })
})

server.get('/v1/menu/tree', (req, res) => {
  res.jsonp(require('./menu.tree.json'))
})

server.use((req, res, next) => {
  const method = req.method
  const url = req.url

  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', '*')

  next()
})

server.use(jsonServer.rewriter({
  '/v1/*': '/$1',
  '/master/*': '/$1',
  '/i18n/all': '/i18n'
}))

server.use(router)

router.render = (req, res) => {
  const method = req.method
  const url = req.url
  
  if(method === 'GET') {
    res.jsonp({
      statusCode: {
        defaultCode: 200,
        customCode: 'S0000',
        classCode: 'XXX'
      },
      message: 'Data fetched',
      payload: {
        totalRecords: res.locals.data.length,
        data: res.locals.data
      },
      transaction_classify: '',
      transaction_id: null
    })
  } else {
    res.jsonp({
      statusCode: {
        defaultCode: 200,
        customCode: 'S0000',
        classCode: 'XXX'
      },
      payload: {},
      transaction_classify: '',
      transaction_id: null
    })
  }
}
server.listen(10200, () => {
  console.log('JSON Server is running')
})