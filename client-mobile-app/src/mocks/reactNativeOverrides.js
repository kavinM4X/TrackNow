import * as RNW from 'react-native-web';

export const TurboModuleRegistry = {
  get: () => null,
  getEnforcing: () => null
};

const RN = {
  ...RNW,
  TurboModuleRegistry
};

export default RN;
export * from 'react-native-web';
