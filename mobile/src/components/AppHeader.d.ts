import * as React from 'react';

export interface AppHeaderProps {
  title: string;
  rightIcon?: React.ReactNode;
  onRightPress?: () => void;
}

export default function AppHeader(props: AppHeaderProps): React.JSX.Element;

