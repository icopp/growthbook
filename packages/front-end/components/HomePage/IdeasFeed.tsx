import { FC, useContext } from "react";
import useApi from "../../hooks/useApi";
import LoadingOverlay from "../LoadingOverlay";
import { ago } from "../../services/dates";
import { UserContext } from "../ProtectedPage";
import { useRouter } from "next/router";
import Markdown from "../Markdown/Markdown";
import { IdeaInterface } from "back-end/types/idea";
import { useDefinitions } from "../../services/DefinitionsContext";

const IdeasFeed: FC<{
  num?: number;
}> = ({ num = 10 }) => {
  const { project } = useDefinitions();
  const { data, error } = useApi<{
    ideas: IdeaInterface[];
  }>(`/ideas/recent/${num}?project=${project || ""}`);

  const router = useRouter();

  const { users } = useContext(UserContext);

  if (error) {
    return <div className="alert alert-danger">{error.message}</div>;
  }
  if (!data) {
    return <LoadingOverlay />;
  }

  return (
    <div className="">
      {data.ideas.length === 0 && <span>No recent ideas</span>}
      <ul className="list-unstyled simple-divider pl-0 mb-0">
        {data.ideas.map((idea, i) => {
          const linkUrl = "/idea/" + idea.id;
          const user = users.get(idea.userId);
          const email = user ? user.email : "";
          const name = user ? user.name : idea.userName;

          return (
            <li className="hover-highlight" key={i}>
              <div
                className="cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  router.push(linkUrl);
                }}
              >
                <div className="" style={{ maxHeight: 200, overflowY: "auto" }}>
                  {idea.impactScore && (
                    <div
                      className="float-right purple-circle"
                      title="Impact score"
                    >
                      {idea.impactScore}
                    </div>
                  )}
                  <Markdown className="card-text semi-bold mb-1">
                    {idea.text || ""}
                  </Markdown>
                  <div className="text-muted">
                    {ago(idea.dateCreated)} &middot; {name || email}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default IdeasFeed;
