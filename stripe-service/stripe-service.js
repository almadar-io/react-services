import { observer } from "mobx-react";
import { observable, action, runInAction, toJS } from "mobx";
import React from "react";
import axios from "axios";

//export store
export class stripeDomainStore {
  modelName;
  mapStore = observable.map();
  rootStore;
  SERVER;
  offlineStorage;
  /**
   * Represents the notification domain store.
   * @type {any}
   */
  notificationDomainStore;
  constructor(rootStore, offlineStorage, SERVER, notificationDomainStore) {
    this.rootStore = rootStore;
    this.notificationDomainStore = notificationDomainStore;
    if (offlineStorage) {
      this.offlineStorage = offlineStorage;
    }
    this.SERVER = SERVER;
  }
  //@action
  forceUpdate(modelName) {
    let current = this.mapStore.get(modelName);
    this.mapStore.set(modelName, []);
    this.mapStore.set(modelName, current);
  }
  //@action
  getModel(query, modelName, refresh, transform) {
    //cached data, you don't have to hit up he end point
    if (this.mapStore.get(modelName) && !refresh) {
      return;
    }
    return this.offlineStorage
      .getItem("jwtToken")
      .then(token => {
        return axios
          .get(`${this.SERVER.host}:${this.SERVER.port}/${modelName}`, {
            params: { token, query }
          })
          .then(res => {
            runInAction(() => {
              if (transform) {
                let transformedModel = transform(res.data);
                return this.mapStore.set(modelName, transformedModel);
              }
              this.mapStore.set(modelName, res.data);
            });
          })
          .catch(err => {
            this.setError(modelName, err);
          });
      })
      .catch(err => {
        return this.setError(modelName, err);
      });
  }
  //@action
  createModel(modelName, model) {
    return this.offlineStorage.getItem("jwtToken").then(token => {
      return axios
        .post(`${this.SERVER.host}:${this.SERVER.port}/${modelName}/create`, {
          model,
          token
        })
        .then(res => {
          let current = this.mapStore.get(modelName);
          this.mapStore.set(modelName, [...current, res.data]);
          this.setSuccess(modelName, `${modelName} successfully created!`);
          return res.data;
        })
        .catch(err => {
          console.log("hellooooo", err);
          return this.setError(modelName, err);
        });
    });
  }
  //@action
  updateModel(modelName, model, updateValues) {
    let extractedModel = toJS(model);
    Object.keys(updateValues).map(key => {
      model[key] = updateValues[key];
    });
    return this.offlineStorage.getItem("jwtToken").then(token => {
      return axios
        .put(`${this.SERVER.host}:${this.SERVER.port}/${modelName}`, {
          model,
          token
        })
        .then(res => {
          let updatedModel = this.mapStore
            .get(modelName)
            .map(cModel => (cModel._id === model._id ? model : cModel));
          this.mapStore.set(modelName, updatedModel);
          this.setSuccess(modelName, `${modelName} successfully updated!`);
          return res.data;
        })
        .catch(err => {
          return this.setError(modelName, err);
        });
    });
  }
  //@action
  deleteModel(modelName, model) {
    model.deleted = true;
    this.forceUpdate(modelName);
    return this.offlineStorage.getItem("jwtToken").then(token => {
      return axios
        .delete(
          `${this.SERVER.host}:${this.SERVER.port}/${modelName}/${model._id}`,
          {
            params: { token }
          }
        )
        .then(res => {
          this.setSuccess(modelName, `${modelName} successfully deleted!`);
          return res.data;
        })
        .catch(err => {
          return this.setError(modelName, err);
        });
    });
  }
  //@action
  searchModel(modelName, query) {
    return this.offlineStorage.getItem("jwtToken").then(token => {
      return axios
        .post(`${this.SERVER.host}:${this.SERVER.port}/${modelName}/search`, {
          query,
          token
        })
        .then(res => {
          return res.data;
        })
        .catch(err => {
          return this.setError(modelName, err);
        });
    });
  }
  //@action
  setError(modelName, err) {
    if (this.notificationDomainStore) {
      this.notificationDomainStore.saveNotification(modelName, {
        message: err && err.response && err.response.data.message,
        type: "error"
      });
    }
  }
  //@action
  setSuccess(modelName, successMessage) {
    if (this.notificationDomainStore) {
      this.notificationDomainStore.saveNotification(modelName, {
        message: successMessage,
        type: "success"
      });
    }
  }
  //@action
  getAppSettings() {
    return this.offlineStorage.getItem("jwtToken").then(token => {
      return axios
        .get(`${this.SERVER.host}:${this.SERVER.port}/settings`, {
          params: { token }
        })
        .then(res => {
          runInAction(() => {
            this.mapStore.set("settings", res.data);
          });
          return res.data[0];
        })
        .catch(err => {
          this.setError("settings", err);
        });
    });
  }
}

const injectProps = (
  stripeDomainStore,
  modelName,
  props,
  child,
  query,
  transform
) => {
  let injected = {
    model: transform
      ? transform(stripeDomainStore.mapStore.get(modelName))
      : stripeDomainStore.mapStore.get(modelName),
    getModel: query =>
      stripeDomainStore.getModel(query, modelName, true, transform),
    createModel: model => stripeDomainStore.createModel(modelName, model),
    updateModel: (model, updateValues) =>
      stripeDomainStore.updateModel(modelName, model, updateValues),
    deleteModel: model => stripeDomainStore.deleteModel(modelName, model),
    query: query,
    ...props,
    ...child.props
  };

  injected[modelName] = stripeDomainStore.mapStore.get(modelName);

  injected[`${modelName}_getModel`] = query => {
    stripeDomainStore.getModel(query, modelName, true, transform);
  };
  injected[`${modelName}_createModel`] = model =>
    stripeDomainStore.createModel(modelName, model);

  injected[`${modelName}_updateModel`] = (model, updateValues) =>
    stripeDomainStore.updateModel(modelName, model, updateValues);

  injected[`${modelName}_deleteModel`] = model =>
    stripeDomainStore.deleteModel(modelName, model);

  injected[`${modelName}_searchModel`] = query =>
    stripeDomainStore.searchModel(modelName, query);

  injected[`searchModels`] = (modelNames, query) => {
    let promises = modelNames.map(modelName => {
      return stripeDomainStore.searchModel(modelName, query).then(res => {
        return { modelName, res };
      });
    });
    return promises;
  };

  injected[`${modelName}_query`] = query;

  return injected;
};

//determine the theme here and load the right login information?
//@observer
export class Stripe extends React.Component {
  constructor(props) {
    super(props);
  }
  componentDidMount() {}
  componentWillReceiveProps(nextProps) {}
  componentDidUpdate() {}
  render() {
    let {
      modelName,
      children,
      stripeDomainStore,
      skipLoadOnInit,
      query,
      transform
    } = this.props;
    if (modelName && !skipLoadOnInit) {
      stripeDomainStore.getModel(query, modelName, false);
    }
    const childrenWithProps = React.Children.map(children, child => {
      let injectedProps = injectProps(
        stripeDomainStore,
        modelName,
        this.props,
        child,
        query,
        transform
      );
      return React.cloneElement(child, injectedProps);
    });
    return <React.Fragment>{childrenWithProps}</React.Fragment>;
  }
}

export function withStripe(WrappedComponent) {
  //@observer
  class WithStripe extends React.Component {
    constructor(props) {
      super(props);
    }
    componentDidMount() {
      let { modelName, stripeDomainStore, query } = this.props;
      stripeDomainStore.getModel(query, modelName, false);
    }
    componentWillReceiveProps() {}
    render() {
      let { modelName, stripeDomainStore, query, transform } = this.props;
      let injectedProps = injectProps(
        stripeDomainStore,
        modelName,
        this.props,
        this,
        query,
        transform
      );
      return <WrappedComponent {...injectedProps} />;
    }
  }
  return WithStripe;
}
