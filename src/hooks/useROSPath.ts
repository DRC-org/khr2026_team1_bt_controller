import { useEffect, useState } from 'react';
import * as ROSLIB from 'roslib';

interface Spot {
  name: string;
  x: number;
  y: number;
  score: number;
  required_for_vgoal: boolean;
}

interface PathData {
  spots: Record<number, Spot>;
  path: number[];
  timestamp: number;
}

export function useROSPath(rosbridgeUrl: string) {
  const [pathData, setPathData] = useState<PathData | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const ros = new ROSLIB.Ros({
      url: rosbridgeUrl
    });

    ros.on('connection', () => {
      console.log('✅ Connected to ROS bridge');
      setConnected(true);
    });

    ros.on('error', (error: unknown) => {
      console.error('❌ ROS bridge error:', error);
      setConnected(false);
    });

    ros.on('close', () => {
      console.log('🔌 Connection to ROS bridge closed');
      setConnected(false);
    });

    // Subscribe to planned path topic
    const pathTopic = new ROSLIB.Topic({
      ros: ros,
      name: '/task_planner/planned_path',
      messageType: 'std_msgs/String'
    });

    pathTopic.subscribe((message: any) => {
      try {
        const data = JSON.parse(message.data) as PathData;
        console.log('🗺️ Received new path:', data.path.length, 'waypoints');
        setPathData(data);
      } catch (error) {
        console.error('❌ Failed to parse path data:', error);
      }
    });

    return () => {
      pathTopic.unsubscribe();
      ros.close();
    };
  }, [rosbridgeUrl]);

  return { pathData, connected };
}
