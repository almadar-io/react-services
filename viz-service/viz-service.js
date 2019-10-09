import { observer } from "mobx-react";
import { types } from "mobx-state-tree";
import React from "react";
import axios from "axios";

//export store
export const getVizDomainStore = (
  modelName,
  offlineStorage,
  SERVER,
  notificationDomainStore
) =>
  types
    .model({
      id: types.identifier,
      state: types.frozen(),
      status: types.string,
      loading: types.optional(types.boolean, true)
    })
    .actions(self => ({
      fetchModel(query) {
        self.loading = true;
        return offlineStorage
          .getItem("jwtToken")
          .then(token => {
            return axios
              .get(`${SERVER.host}:${SERVER.port}/${modelName}`, {
                params: { token, query }
              })
              .then(res => {
                self.setSuccess(res.data);
              })
              .catch(err => {
                self.setError(err);
              });
          })
          .catch(err => {
            return self.setError(err);
          });
      },
      average(model) {
        self.loading = true;
        return offlineStorage.getItem("jwtToken").then(token => {
          return axios
            .post(`${SERVER.host}:${SERVER.port}/${modelName}/create`, {
              model,
              token
            })
            .then(res => {
              self.setSuccess(
                [...self.state, model],
                `${modelName} successfully created!`
              );
              return res.data;
            })
            .catch(err => {
              return self.setError(err);
            });
        });
      },
      count(model, updateValues) {
        self.loading = true;
        Object.keys(updateValues).map(key => {
          model[key] = updateValues[key];
        });
        return offlineStorage.getItem("jwtToken").then(token => {
          return axios
            .put(`${SERVER.host}:${SERVER.port}/${modelName}`, {
              model,
              token
            })
            .then(res => {
              self.setSuccess(
                [...self.state.filter(m => model._id !== m._id), model],
                `${modelName} successfully updated!`
              );
            })
            .catch(err => {
              return self.setError(err);
            });
        });
      },
      distinct(model) {
        self.loading = true;
        return offlineStorage.getItem("jwtToken").then(token => {
          return axios
            .delete(`${SERVER.host}:${SERVER.port}/${modelName}/${model._id}`, {
              params: { token }
            })
            .then(res => {
              self.setSuccess(
                self.state.filter(m => m !== model),
                `${modelName} successfully deleted!`
              );
            })
            .catch(err => {
              return self.setError(err);
            });
        });
      },
      aggregate(query) {
        self.loading = true;
        return offlineStorage.getItem("jwtToken").then(token => {
          return axios
            .post(`${SERVER.host}:${SERVER.port}/${modelName}/search`, {
              query,
              token
            })
            .then(res => {
              return res.data;
            })
            .catch(err => {
              console.log("err", err);
              return self.setError(err);
            });
        });
      },
      aggregates(query, modelName) {
        self.loading = true;
        return offlineStorage.getItem("jwtToken").then(token => {
          return axios
            .post(`${SERVER.host}:${SERVER.port}/${modelName}/search`, {
              query,
              token
            })
            .then(res => {
              return res.data;
            })
            .catch(err => {
              console.log("err", err);
              return self.setError(err);
            });
        });
      },
      setError(err) {
        self.loading = false;
        if (notificationDomainStore) {
          notificationDomainStore.saveNotification(modelName, {
            message: !err.response
              ? err
              : err && err.response && err.response.data.message,
            type: "error"
          });
        }
        self.status = "error";
      },
      setSuccess(data, successMessage) {
        self.loading = false;
        if (notificationDomainStore && successMessage) {
          notificationDomainStore.saveNotification(modelName, {
            message: successMessage,
            type: "success"
          });
        }
        if (data) {
          self.state = data;
        }
        self.status = "success";
      }
    }))
    .views(self => ({
      sum(query) {
        return self.state;
      },
      isLoading() {
        return self.loading;
      }
    }));

const injectProps = (
  vizDomainStore,
  modelName,
  props,
  child,
  query,
  transform
) => {
  let injected = {
    ...props,
    ...child.props
  };
  injected[modelName] = transform
    ? transform(vizDomainStore.state)
    : vizDomainStore.state;
  injected[`${modelName}_sum`] = query => {
    vizDomainStore.sum(query, true, transform);
  };
  injected[`${modelName}_average`] = model =>
    vizDomainStore.average(model);

  injected[`${modelName}_count`] = (model, updateValues) =>
    vizDomainStore.count(model, updateValues);

  injected[`${modelName}_distinct`] = model =>
    vizDomainStore.distinct(model);

  injected[`${modelName}_aggregate`] = query =>
    vizDomainStore.aggregate(query);

  injected[`aggregates`] = (query, modelNames) => {
    let promises = modelNames.map(mName => {
      return vizDomainStore.aggregates(query, mName).then(res => {
        return { res };
      });
    });
    return promises;
  };

  injected[`${modelName}_query`] = query;

  injected[`${modelName}_loading`] = vizDomainStore.isLoading();

  return injected;
};

//determine the theme here and load the right login information?
class VizContainer extends React.Component {
  constructor(props) {
    super(props);
    this.stores = {};
  }
  componentDidMount() {}
  componentWillReceiveProps(nextProps) {}
  componentDidUpdate() {}
  render() {
    let {
      modelName,
      children,
      skipLoadOnInit,
      query,
      transform,
      offlineStorage,
      SERVER,
      notificationDomainStore
    } = this.props;
    if (modelName && !this.stores[modelName] && !skipLoadOnInit) {
      const vizDomainStore = getVizDomainStore(
        modelName,
        offlineStorage,
        SERVER,
        notificationDomainStore,
        transform
      ).create({
        state: [],
        id: "1",
        status: "initial"
      });
      vizDomainStore.fetchModel();
      this.stores[modelName] = vizDomainStore;
    }
    const childrenWithProps = React.Children.map(children, child => {
      let injectedProps = injectProps(
        this.stores[modelName],
        modelName,
        this.props,
        child,
        query,
        transform
      );
      return React.cloneElement(child, { ...injectedProps });
    });
    return <React.Fragment>{childrenWithProps}</React.Fragment>;
  }
}

export function withViz(WrappedComponent) {
  class WithViz extends React.Component {
    constructor(props) {
      super(props);
    }
    componentWillReceiveProps() {}
    render() {
      let { vizDomainStore, query, transform } = this.props;
      let injectedProps = injectProps(
        vizDomainStore,
        this.props,
        this,
        query,
        transform
      );
      return <WrappedComponent {...injectedProps} />;
    }
  }
  return observer(WithViz);
}

export const Viz = observer(VizContainer);
