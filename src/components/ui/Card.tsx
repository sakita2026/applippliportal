import { HTMLAttributes } from "react";
import { BaseComponentProps } from "@/types";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Card (wrapper)
// ---------------------------------------------------------------------------

export interface CardProps
  extends BaseComponentProps,
    HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** カードに影を付けるか（デフォルト: true） */
  shadow?: boolean;
  /** ホバー時にカードを浮き上がらせるか（デフォルト: false） */
  hoverable?: boolean;
}

/**
 * 汎用カードコンポーネント
 * CardHeader / CardBody / CardFooter と組み合わせて使用する
 */
export function Card({
  shadow = true,
  hoverable = false,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-gray-200 bg-white",
        shadow && "shadow-sm",
        hoverable &&
          "transition-shadow duration-200 hover:shadow-md cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CardHeader
// ---------------------------------------------------------------------------

export interface CardHeaderProps
  extends BaseComponentProps,
    HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function CardHeader({ className, children, ...props }: CardHeaderProps) {
  return (
    <div
      className={cn("px-6 py-4 border-b border-gray-100", className)}
      {...props}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CardBody
// ---------------------------------------------------------------------------

export interface CardBodyProps
  extends BaseComponentProps,
    HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function CardBody({ className, children, ...props }: CardBodyProps) {
  return (
    <div className={cn("px-6 py-4", className)} {...props}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CardFooter
// ---------------------------------------------------------------------------

export interface CardFooterProps
  extends BaseComponentProps,
    HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function CardFooter({ className, children, ...props }: CardFooterProps) {
  return (
    <div
      className={cn(
        "px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-xl",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
