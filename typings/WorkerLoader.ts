//Custom module declaration so that we can use the WebpackWorker module
declare module 'worker-loader*' {
    class WebpackWorker extends Worker {
        public constructor()
    }

    export = WebpackWorker
}
