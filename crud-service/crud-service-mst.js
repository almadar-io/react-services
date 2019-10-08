import { observer } from "mobx-react";
import { types } from "mobx-state-tree";
import React from "react";
import axios from "axios";

//export store
export const getCrudDomainStore = (
  modelName,
  offlineStorage,
  SERVER,
  notificationDomainStore,
  transform
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
      createModel(model) {
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
      updateModel(model, updateValues) {
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
      deleteModel(model) {
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
      searchModel(query) {
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
      searchModels(query, modelName) {
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
      getModel(query) {
        return self.state;
      },
      isLoading() {
        return self.loading;
      }
    }));

const injectProps = (
  crudDomainStore,
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
    ? transform(crudDomainStore.state)
    : crudDomainStore.state;
  injected[`${modelName}_getModel`] = query => {
    crudDomainStore.getModel(query, true, transform);
  };
  injected[`${modelName}_createModel`] = model =>
    crudDomainStore.createModel(model);

  injected[`${modelName}_updateModel`] = (model, updateValues) =>
    crudDomainStore.updateModel(model, updateValues);

  injected[`${modelName}_deleteModel`] = model =>
    crudDomainStore.deleteModel(model);

  injected[`${modelName}_searchModel`] = query =>
    crudDomainStore.searchModel(query);

  injected[`searchModels`] = (query, modelNames) => {
    let promises = modelNames.map(mName => {
      return crudDomainStore.searchModels(query, mName).then(res => {
        return { res };
      });
    });
    return promises;
  };

  injected[`${modelName}_query`] = query;

  injected[`${modelName}_loading`] = crudDomainStore.isLoading();

  return injected;
};

//determine the theme here and load the right login information?
class CrudContainer extends React.Component {
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
      const crudDomainStore = getCrudDomainStore(
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
      crudDomainStore.fetchModel();
      this.stores[modelName] = crudDomainStore;
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

export function withCrud(WrappedComponent) {
  class WithCrud extends React.Component {
    constructor(props) {
      super(props);
    }
    componentDidMount() {
      let { crudDomainStore, query } = this.props;
      crudDomainStore.getModel(query, false);
    }
    componentWillReceiveProps() {}
    render() {
      let { crudDomainStore, query, transform } = this.props;
      let injectedProps = injectProps(
        crudDomainStore,
        this.props,
        this,
        query,
        transform
      );
      return <WrappedComponent {...injectedProps} />;
    }
  }
  return observer(WithCrud);
}

export const Crud = observer(CrudContainer);
