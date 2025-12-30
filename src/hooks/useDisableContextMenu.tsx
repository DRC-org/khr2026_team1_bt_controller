import { useEffect } from 'react';

export function useDisableContextMenu() {
  useEffect(() => {
    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    document.addEventListener('contextmenu', handleContextMenu);

    // クリーンアップ関数を返す
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);
}
