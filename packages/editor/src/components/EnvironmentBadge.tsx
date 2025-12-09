import { cn } from '@/lib/utils';

export type Environment = 'DV' | 'UT' | 'LT' | 'PD';

interface EnvironmentBadgeProps {
  environment: Environment;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const environmentConfig: Record<Environment, { label: string; fullName: string; color: string; bgColor: string }> = {
  DV: {
    label: 'DV',
    fullName: 'Development',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
  },
  UT: {
    label: 'UT',
    fullName: 'User Testing',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
  },
  LT: {
    label: 'LT',
    fullName: 'Load Testing',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
  },
  PD: {
    label: 'PD',
    fullName: 'Production',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
  },
};

export function EnvironmentBadge({ environment, size = 'md', showLabel = false }: EnvironmentBadgeProps) {
  const config = environmentConfig[environment];
  
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium rounded-md',
        config.bgColor,
        config.color,
        sizeClasses[size]
      )}
      title={config.fullName}
    >
      {config.label}
      {showLabel && <span className="font-normal">({config.fullName})</span>}
    </span>
  );
}

export function getNextEnvironment(current: Environment): Environment | null {
  const order: Environment[] = ['DV', 'UT', 'LT', 'PD'];
  const currentIndex = order.indexOf(current);
  if (currentIndex === -1 || currentIndex === order.length - 1) {
    return null;
  }
  return order[currentIndex + 1];
}

export function getPreviousEnvironment(current: Environment): Environment | null {
  const order: Environment[] = ['DV', 'UT', 'LT', 'PD'];
  const currentIndex = order.indexOf(current);
  if (currentIndex <= 0) {
    return null;
  }
  return order[currentIndex - 1];
}

export function getEnvironmentFullName(env: Environment): string {
  return environmentConfig[env].fullName;
}
