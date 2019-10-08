import { observer } from "mobx-react";
import { observable, action, runInAction, toJS } from "mobx";
import React from "react";
import axios from "axios";

//export store
export class notificationDomainStore {
  modelName;
  mapStore = observable.map();
  rootStore;
  SERVER;
  offlineStorage;
  constructor(rootStore, offlineStorage, SERVER) {
    this.rootStore = rootStore;
    if (offlineStorage) {
      this.offlineStorage = offlineStorage;
    }
    this.SERVER = SERVER;
  }
  @action
  forceUpdate(modelName) {
    let current = this.mapStore.get(modelName);
    this.mapStore.set(modelName, []);
    this.mapStore.set(modelName, current);
  }
  @action
  saveNotification(modelName, notificationObject) {
    let notifications = this.mapStore.get(modelName);
    if (!notifications) {
      this.mapStore.set(modelName, []);
      notifications = [];
    }
    let current = this.mapStore.get(modelName);
    this.mapStore.set(modelName, [...current, notificationObject]);
  }
  @action
  removeNotification(modelName, notificationObject) {
    notificationObject.deleted = true;
    this.forceUpdate(modelName);
  }
}

//determine the theme here and load the right login information?
@observer
export class Notification extends React.Component {
  constructor(props) {
    super(props);
  }
  componentDidMount() { }
  componentWillReceiveProps(nextProps) { }
  componentDidUpdate() { }
  render() {
    let { children, notificationDomainStore, modelName } = this.props;
    const childrenWithProps = React.Children.map(children, child => {
      return React.cloneElement(child, {
        notifications: notificationDomainStore.mapStore.get(modelName),
        saveNotification: notificationObject =>
          notificationDomainStore.saveNotification(
            modelName,
            notificationObject
          ),
        removeNotification: notificationObject =>
          notificationDomainStore.removeNotification(
            modelName,
            notificationObject
          ),
        ...this.props,
        ...child.props
      });
    });
    return <React.Fragment>{childrenWithProps}</React.Fragment>;
  }
}
