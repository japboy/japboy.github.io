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
    <main className="flex min-h-screen flex-col-reverse items-center justify-center bg-white pt-[100px] text-gray-800 dark:bg-gray-800 dark:text-gray-100">
      <div className="mt-8 flex flex-col items-center">
        <button
          className="h-[100px] w-[100px] rounded-full"
          onClick={toggleGreeted}
        >
          <img
            className={classnames(
              "origin-center rounded-full bg-gray-100 transition-transform duration-200 dark:bg-gray-700",
              { "rotate-[10deg]": greeted, "rotate-0": !greeted },
            )}
            height="100"
            src={`https://www.gravatar.com/avatar/${gravatarHash}?s=200`}
            width="100"
          />
        </button>

        <div
          className={classnames(
            "mt-4 flex items-center transition-opacity duration-200",
            {
              "opacity-0": !initiated || greeted,
              "opacity-100": initiated && !greeted,
            },
          )}
        >
          <a className="group mx-1 block" {...linkedinAttr}>
            <i className="fab fa-linkedin text-2xl transition-colors duration-200 group-hover:text-gray-400 dark:group-hover:text-gray-600" />
          </a>
          <a className="group mx-1 block" {...githubAttr}>
            <i className="fab fa-github text-2xl transition-colors duration-200 group-hover:text-gray-400 dark:group-hover:text-gray-600" />
          </a>
        </div>
      </div>

      <Balloon
        className={classnames(
          "transition-all duration-200 sm:w-11/12 lg:max-w-[280px]",
          {
            "translate-y-0 opacity-100": greeted,
            "pointer-events-none translate-y-1 opacity-0": !greeted,
          },
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
