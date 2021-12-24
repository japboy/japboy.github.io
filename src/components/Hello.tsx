import classnames from "classnames";
import React, { useEffect, useState, FunctionComponent } from "react";

import Balloon from "./Balloon";

export interface Props {}

const Hello: FunctionComponent<Props> = () => {
  const gravatarHash = "1e4b7d2f20a2ecb20497d9b8704e6107";

  const [initiated, setInitiated] = useState(false);

  const [greeted, setGreeted] = useState(false);
  const toggleGreeted = () => setGreeted(!greeted);

  const linkedinAttr =
    !initiated || greeted ? {} : { href: "https://www.linkedin.com/in/yuinao" };
  const githubAttr =
    !initiated || greeted ? {} : { href: "https://github.com/japboy" };

  useEffect(() => {
    setTimeout(() => {
      setInitiated(true);
      setGreeted(true);
    }, 300);
  }, []);

  return (
    <main className="bg-white dark:bg-gray-800 flex flex-col-reverse items-center justify-center min-h-screen pt-[100px] text-gray-800 dark:text-gray-100">
      <div className="flex flex-col items-center mt-8">
        <button
          className="h-[100px] rounded-full w-[100px]"
          onClick={toggleGreeted}
        >
          <img
            className={classnames(
              "bg-gray-100 dark:bg-gray-700 duration-200 origin-center rounded-full transition-transform",
              { "rotate-[10deg]": greeted, "rotate-0": !greeted }
            )}
            height="100"
            src={`https://www.gravatar.com/avatar/${gravatarHash}?s=200`}
            width="100"
          />
        </button>

        <div
          className={classnames(
            "flex duration-200 items-center mt-4 transition-opacity",
            {
              "opacity-0": !initiated || greeted,
              "opacity-100": initiated && !greeted,
            }
          )}
        >
          <a className="group block mx-1" {...linkedinAttr}>
            <i className="fab fa-linkedin group-hover:text-gray-400 dark:group-hover:text-gray-600 text-2xl transition-colors duration-200" />
          </a>
          <a className="group block mx-1" {...githubAttr}>
            <i className="fab fa-github group-hover:text-gray-400 dark:group-hover:text-gray-600 text-2xl transition-colors duration-200" />
          </a>
        </div>
      </div>

      <Balloon
        className={classnames(
          "duration-200 transition-all lg:max-w-[280px] sm:w-11/12",
          {
            "opacity-100 translate-y-0": greeted,
            "opacity-0 pointer-events-none translate-y-1": !greeted,
          }
        )}
      >
        <p>
          Hi, I'm Yu Inao.
          <br />
          Currently working as a senior web frontend developer in Tokyo.
        </p>
        <p>
          My passions focus on web UI development, component-based UI design,
          performant web, web apps, &amp; web standards.
        </p>
      </Balloon>
    </main>
  );
};

export default Hello;
