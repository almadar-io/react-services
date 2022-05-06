import React from "react";
import {
  generateDomainStore,
  getServiceInjector,
  getServiceHOC
} from "../service-service/service-service";
import axios from "axios";

export const Wikipedia = ({
  myDomainStore,
  children,
  notificationDomainStore,
  offlineStorage,
  SERVER,
  transform,
  ...rest
}) => {
  const modelName = "wikipedia";
  const myActions = props => {
    return {
      wikipediaFetchModel: () => {
        return props.self.state;
      },
      fetchPageByTopic: topic => {
        return offlineStorage.getItem("jwtToken").then(token => {
          return axios({
            url: `${SERVER.wikipedia.host}`,
            method: "get",
            params: {
              action: "opensearch",
              format: "json",
              search: topic,
              origin: "*"
            }
          })
            .then(res => {
              return transform
                ? props.self.setSuccess(transform(res.data))
                : props.self.setSuccess(res.data, "Query successfully run");
            })
            .catch(err => {
              return props.self.setError(err);
            });
        });
      },
      fetchImagesByTopic: topic => {
        return offlineStorage.getItem("jwtToken").then(token => {
          return axios({
            url: `${SERVER.wikimedia.host}`,
            method: "get",
            params: {
              action: "query",
              prop: "images",
              format: "json",
              origin: "*",
              imlimit: 500,
              redirects: 1,
              titles: topic
            }
          })
            .then(res => {
              return res.data.query.pages;
            })
            .catch(err => {
              return props.self.setError(err);
            });
        });
      }
    };
  };
  const getWikipediaDomainStore = generateDomainStore({
    modelName,
    myActionGenerator: myActions
  });
  const domainStore = getWikipediaDomainStore({
    notificationDomainStore,
    offlineStorage,
    SERVER,
    transform
  });
  const WikipediaServiceInjector = getServiceInjector({
    modelName,
    domainStore,
    myActions: myActions()
  });
  const WikipediaHOC = getServiceHOC({
    modelName,
    domainStore,
    serviceInjector: WikipediaServiceInjector,
    children
  });
  return <WikipediaHOC {...rest} />;
};
