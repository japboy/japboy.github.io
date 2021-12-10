import classnames from "classnames";
import React, { FunctionComponent, ReactNode } from "react";

export interface Props {
  className: string;
  children: ReactNode;
}

const Balloon: FunctionComponent<Props> = ({ className = "", children }) => {
  return (
    <div
      className={classnames(
        'bg-gray-800 dark:bg-white p-4 relative rounded text-gray-100 dark:text-gray-800 after:absolute after:border-b-[12px] after:border-b-transparent after:border-t-[12px] after:border-t-gray-800 dark:after:border-t-white after:border-x-[12px] after:border-x-transparent after:content-[""] after:left-[50%] after:-ml-[6px] after:top-full',
        className
      )}
    >
      {children}
    </div>
  );
};

export default Balloon;
