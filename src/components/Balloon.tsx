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
        'relative rounded bg-gray-800 p-4 text-gray-100 after:absolute after:left-[50%] after:top-full after:-ml-[6px] after:border-x-[12px] after:border-b-[12px] after:border-t-[12px] after:border-x-transparent after:border-b-transparent after:border-t-gray-800 after:content-[""] dark:bg-white dark:text-gray-800 dark:after:border-t-white',
        className
      )}
    >
      {children}
    </div>
  );
};

export default Balloon;
