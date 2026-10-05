// Metro turns an imported picture into an asset id that <Image> accepts.
declare module '*.png' {
  import type { ImageSourcePropType } from 'react-native';

  const source: ImageSourcePropType;
  export default source;
}
