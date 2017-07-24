var path = require('path')
var webpack = require('webpack')
var HtmlWebpackPlugin = require('html-webpack-plugin');
var ExtractTextPlugin = require('extract-text-webpack-plugin');
var OpenBrowserPlugin = require('open-browser-webpack-plugin');

// var nodeModulesPath = path.resolve(__dirname, 'node_modules')
// console.log(process.env.NODE_ENV)

module.exports = {
    entry: path.resolve(__dirname, 'src/static/index.jsx'),
    output: {
        path: __dirname + "/build",
        filename: "bundle.js"
    },

    resolve:{
        extensions:['.js','.jsx']
    },

    module: {
        // preLoaders: [
        //     // 报错 ？？？？？
        //     {test: /\.(js|jsx)$/, loader: "eslint-loader", exclude: /node_modules/}
        // ],
        loaders: [
            { test: /\.(js|jsx)$/, exclude: /node_modules/, loader: 'babel-loader' },
            { test: /\.less$/, exclude: /node_modules/, loader: 'style-loader!css-loader!postcss-loader!less-loader' },
            { test: /\.css$/, exclude: /node_modules/, loader: 'style-loader!css-loader!postcss-loader' },
            { test:/\.(png|gif|jpg|jpeg|bmp)$/i, loader:'url-loader?limit=5000' },  // 限制大小5kb
            { test:/\.(png|woff|woff2|svg|ttf|eot)($|\?)/i, loader:'url-loader?limit=5000'} // 限制大小小于5k
        ]
    },

    

    
    plugins: [

        new webpack.LoaderOptionsPlugin({
            options: {
                postcss: function(){
                    return [require('autoprefixer')]
                },
                eslint: {
                    configFile: '.eslintrc' // Rules for eslint
                },
                devServer: {
                    proxy: {
                      // 凡是 `/api` 开头的 http 请求，都会被代理到 localhost:3000 上，由 koa 提供 mock 数据。
                      // koa 代码在 ./mock 目录中，启动命令为 npm run mock
                      '/api': {
                        target: 'http://localhost:3000',
                        secure: false
                      }
                    },
                    contentBase: "./src/public", //本地服务器所加载的页面所在的目录
                    colors: true, //终端中输出结果为彩色
                    historyApiFallback: true, //不跳转
                    inline: true, //实时刷新
                    hot: true  // 使用热加载插件 HotModuleReplacementPlugin
                }
            }
        }),
        // html 模板插件
        // new HtmlWebpackPlugin({
        //     template: __dirname + '/src/static/index-test.tmpl.html'
        // }),

        // 热加载插件
        new webpack.HotModuleReplacementPlugin(),

        // 打开浏览器
        new OpenBrowserPlugin({
          url: 'http://localhost:8080'
        }),

        // 可在业务 js 代码中使用 __DEV__ 判断是否是dev模式（dev模式下可以提示错误、测试报告等, production模式不提示）
        new webpack.DefinePlugin({
          __DEV__: JSON.stringify(JSON.parse((process.env.NODE_ENV == 'dev') || 'false'))
        })
    ],

    
}
