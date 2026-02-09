import { Center, CenterProps, useStyleConfig } from '@chakra-ui/react';

const PaneTitle = (props: CenterProps) => {
  const styles = useStyleConfig('PaneTitle');
  return <Center __css={styles} {...props} />;
};

const PaneTitleTheme = {
  baseStyle: {
    fontSize: 'xs',
    fontWeight: 'semibold',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: '#0f172a'
  }
};

export { PaneTitle, PaneTitleTheme };
