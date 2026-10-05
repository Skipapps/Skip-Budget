// Metro turns an imported video into an asset id that expo-video accepts.
declare module '*.mp4' {
  const source: number;
  export default source;
}
