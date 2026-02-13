import { useCallback, useEffect, useRef, useState } from 'react';
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

interface RobotPose {
  position: { x: number; y: number; z: number };
  orientation: { x: number; y: number; z: number; w: number };
}

export interface ScoreDetail {
  total_score: number;
  ote: boolean;
  v_goal: boolean;
  yagura_zone_entered: boolean;
  rings_in_honmaru: number;
}

export interface RobotControlStatus {
  yagura: {
    '1_pos': string;
    '1_state': string;
  };
  ring: {
    '1_pos': string;
    '1_state': string;
  };
}

export function useROS(rosbridgeUrl: string) {
  const [pathData, setPathData] = useState<PathData | null>(null);
  const [currentPose, setCurrentPose] = useState<RobotPose | null>(null);
  const [scoreDetail, setScoreDetail] = useState<ScoreDetail | null>(null);
  const [controlStatus, setControlStatus] = useState<RobotControlStatus | null>(null);
  const [connected, setConnected] = useState(false);
  const rosRef = useRef<ROSLIB.Ros | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cmdVelTopicRef = useRef<any>(null);

  useEffect(() => {
    const ros = new ROSLIB.Ros({
      url: rosbridgeUrl,
    });
    rosRef.current = ros;

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
      messageType: 'std_msgs/String',
    });

    pathTopic.subscribe((message: unknown) => {
      try {
        const msg = message as { data: string };
        const data = JSON.parse(msg.data) as PathData;
        // console.log('🗺️ Received new path:', data.path.length, 'waypoints');
        setPathData(data);
      } catch (error) {
        console.error('❌ Failed to parse path data:', error);
      }
    });

    // Subscribe to robot pose topic
    const poseTopic = new ROSLIB.Topic({
      ros: ros,
      name: '/robot/pose',
      messageType: 'geometry_msgs/PoseStamped',
    });

    interface PoseStampedMessage {
      pose: RobotPose;
    }

    poseTopic.subscribe((message: unknown) => {
      try {
        const msg = message as PoseStampedMessage;
        if (msg.pose) {
          setCurrentPose(msg.pose);
        }
      } catch (error) {
        console.error('❌ Failed to parse pose data:', error);
      }
    });

    // Subscribe to score detail
    const scoreTopic = new ROSLIB.Topic({
      ros: ros,
      name: '/score_detail',
      messageType: 'std_msgs/String',
    });

    scoreTopic.subscribe((message: unknown) => {
      try {
        const msg = message as { data: string };
        setScoreDetail(JSON.parse(msg.data) as ScoreDetail);
      } catch (error) {
        // console.error('❌ Failed to parse score detail:', error);
      }
    });

    // Subscribe to robot control status
    const statusTopic = new ROSLIB.Topic({
      ros: ros,
      name: '/robot_control',
      messageType: 'std_msgs/String',
    });

    statusTopic.subscribe((message: unknown) => {
      try {
        const msg = message as { data: string };
        setControlStatus(JSON.parse(msg.data) as RobotControlStatus);
      } catch (error) {
        // console.error('❌ Failed to parse status:', error);
      }
    });

    // Initialize cmd_vel publisher
    cmdVelTopicRef.current = new ROSLIB.Topic({
      ros: ros,
      name: '/cmd_vel',
      messageType: 'geometry_msgs/Twist',
    });

    return () => {
      pathTopic.unsubscribe();
      poseTopic.unsubscribe();
      scoreTopic.unsubscribe();
      statusTopic.unsubscribe();
      if (cmdVelTopicRef.current) {
        cmdVelTopicRef.current.unadvertise();
      }
      ros.close();
    };
  }, [rosbridgeUrl]);

  // Publish velocity command
  const publishCmdVel = useCallback(
    (linearX: number, linearY: number, angularZ: number) => {
      if (!rosRef.current || !connected || !cmdVelTopicRef.current) return;

      const twist = {
        linear: {
          x: linearX,
          y: linearY,
          z: 0.0,
        },
        angular: {
          x: 0.0,
          y: 0.0,
          z: angularZ,
        },
      };

      cmdVelTopicRef.current.publish(twist);
    },
    [connected],
  );

  return { pathData, currentPose, scoreDetail, controlStatus, connected, publishCmdVel };
}
