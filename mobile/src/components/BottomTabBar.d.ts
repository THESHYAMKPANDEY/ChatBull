import * as React from 'react';

export interface BottomTabBarProps {
  active: string;
  onChats: () => void;
  onFeed: () => void;
  onPrivate: () => void;
  onAI: () => void;
  onProfile: () => void;
}

export default function BottomTabBar(props: BottomTabBarProps): React.JSX.Element;

