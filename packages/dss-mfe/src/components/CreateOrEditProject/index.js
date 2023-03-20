import cn from 'classnames';
import React, { useEffect, useState } from 'react';
import Styles from './CreateOrEditProject.scss';
import AddUser from 'dna-container/AddUser';
import Notification from '../../common/modules/uilab/js/src/notification';
import ProgressIndicator from '../../common/modules/uilab/js/src/progress-indicator';
import { dataikuApi } from '../../apis/dataiku.api';

const classNames = cn.bind(Styles);

const CreateOrEditProject = (props) => {
    const [projectErrorMessage, setProjectErrorMessage] = useState('');
    const [projectName, setProjectName] = useState('');
    const [isUserCanCreateDataiku, setUserCanCreateDataiku] = useState(false);
    const [dataikuCollaborators, setDataikuCollaborators] = useState(props.isEdit && props?.editDataikuProjectDetail?.collaborators?.length > 0 ? props?.editDataikuProjectDetail.collaborators : []);
    const [descriptionErrorMessage, setDescriptionErrorMessage] = useState('');
    const [projectGroupErrorMessage, setProjectGroupErrorMessage] = useState('');
    const [description, setDescription] = useState('');
    const [projectGroup, setProjectGroup] = useState('');

    useEffect(() => {
        if (!props.isEdit) {
            validateUser(props?.user?.id);
        } else {
            setUserCanCreateDataiku(true);
        }
    }, [props.user.id, props.isEdit]); // eslint-disable-line react-hooks/exhaustive-deps

    const validateUser = (userId) => {
        ProgressIndicator.show();
        dataikuApi
            .validateUserPrivilage(userId)
            .then((response) => {
                if (response.data && response.data.canCreate) {
                    setUserCanCreateDataiku(response.data.canCreate)
                }
            })
            .catch((err) => {
                err;
                showErrorNotification('Something went wrong.');
                ProgressIndicator.hide();
            });
    }

    const handleCreateDataikuSubmit = () => {
        if (!props.isEdit) {
            if (!projectName && !description) {
                setDescriptionErrorMessage('description is required *');
                setProjectErrorMessage('Project name is required *');
                return;
            } else if (!description && projectName) {
                setDescriptionErrorMessage('description is required *');
                setProjectErrorMessage('');
                return;
            } else if (description && !projectName) {
                setProjectErrorMessage('Project name is required *');
                setDescriptionErrorMessage('');
                return;
            }

            if (!projectGroup) {
                setProjectGroupErrorMessage('project group is required *');
                return;
            }
            setProjectGroupErrorMessage('');
            setProjectErrorMessage('');
            setDescriptionErrorMessage('');
            createDataikuProject();
        } else {
            updtateDataikuProject();
        }
    }

    const updtateDataikuProject = () => {
        ProgressIndicator.show();
        const data = {
            data: {
                id: props.editDataikuProjectDetail.id,
                projectName: props.editDataikuProjectDetail.projectName,
                description: props.editDataikuProjectDetail.description,
                cloudProfile: props.editDataikuProjectDetail.cloudProfile,
                collaborators: dataikuCollaborators,
                createdBy: props.editDataikuProjectDetail.createdBy,
                createdOn: props.editDataikuProjectDetail.createdOn
            }
        }
        dataikuApi
            .updateDataikuProjects(data, props.editDataikuProjectDetail.id)
            .then((response) => {
                const data = response.data;
                if (data.response.success === 'SUCCESS') {
                    Notification.show('Dataiku project updated successfully');
                    setProjectName('');
                    setDescription('');
                    setDataikuCollaborators([]);
                    ProgressIndicator.hide();
                    props.callDnaDataList();
                } else {
                    ProgressIndicator.hide();
                    Notification.show(
                        'Error while creating dataiku project.\n' + data.response.errors[0].message,
                        'alert',
                    );
                }
            })
            .catch((err) => {
                err;
                showErrorNotification('Something went wrong.');
                ProgressIndicator.hide();
            });
    }

    const createDataikuProject = () => {
        ProgressIndicator.show();
        const data = {
            data: {
                id: "",
                projectName: projectName,
                description: description,
                cloudProfile: projectGroup,
                collaborators: dataikuCollaborators,
                createdBy: "",
                createdOn: ""
            }
        }
        dataikuApi
            .createNewDataikuProjects(data)
            .then((response) => {
                const data = response.data;
                if (data.response.success === 'SUCCESS') {
                    Notification.show('Dataiku project created successfully');
                    setProjectName('');
                    setDescription('');
                    setDataikuCollaborators([]);
                    ProgressIndicator.hide();
                    props.callDnaDataList();
                } else {
                    ProgressIndicator.hide();
                    Notification.show(
                        'Error while creating dataiku project.\n' + data.response.errors[0].message,
                        'alert',
                    );
                }
            })
            .catch((err) => {
                err;
                showErrorNotification('Something went wrong.');
                ProgressIndicator.hide();
            });
    }

    const showErrorNotification = (message) => {
        ProgressIndicator.hide();
        Notification.show(message, 'alert');
    };

    const getCollabarators = (collaborators) => {
        const collabarationData = {
            id: collaborators.id,
            userId: collaborators.userId,
            profile: collaborators.profile,
            givenName: collaborators.givenName,
            surName: collaborators.surName,
            permission: 'reader'
        };

        let duplicateMember = false;
        duplicateMember = dataikuCollaborators?.filter((member) => member.userId === collaborators.userId)?.length
            ? true
            : false;

        if (duplicateMember) {
            Notification.show('Collaborator Already Exist.', 'warning');
        } else {
            dataikuCollaborators.push(collabarationData);
            setDataikuCollaborators([...dataikuCollaborators]);
        }
    }

    const onCollaboratorPermission = (e, userName) => {
        const updatedPermisionList = dataikuCollaborators.map(obj => {
            if (obj.userId === userName) {
                return Object.assign({}, obj, { permission: e.target.value });
            }
            return obj;
        });
        setDataikuCollaborators([...updatedPermisionList]);
    };

    const onCollabaratorDelete = (userName) => {
        return () => {
            const currentCollList = dataikuCollaborators.filter((item) => {
                return item.userId !== userName;
            });
            setDataikuCollaborators(currentCollList);
        };
    };

    return (
        <div className={Styles.createDataikuWrapper}>
            <div>
                <h3>{props.isEdit ? 'Edit Dataiku Project' : 'Create a new Dataiku Project'}</h3>
                <div>
                    <div className={Styles.flexLayout}>
                        <div className={classNames('input-field-group include-error')}>
                            <label id="projectNameLabel" htmlFor="projectNameInput" className="input-label">
                                Project Name <sup>*</sup>
                            </label>
                            {props.isEdit ? <div>{props.editDataikuProjectDetail.projectName}</div> : <input
                                type="text"
                                className="input-field"
                                id="projectNameInput"
                                maxLength={22}
                                placeholder="Type here"
                                autoComplete="off"
                                value={projectName}
                                onChange={(e) => {
                                    if (e.target.value) {
                                        setProjectErrorMessage('');
                                    }
                                    setProjectName(e.target.value);
                                }}
                            />}
                            <span className={classNames('error-message')}>{projectErrorMessage}</span>
                        </div>
                        <div className={classNames('input-field-group include-error')}>
                            <label id="description" className="input-label" htmlFor="description">
                                Description <sup>*</sup>
                            </label>
                            {props.isEdit ? <div>{props.editDataikuProjectDetail.description}</div> : <textarea
                                type="text"
                                className="input-field"
                                id="productNameInput"
                                maxLength={200}
                                placeholder="Type here"
                                autoComplete="off"
                                value={description}
                                onChange={(e) => {
                                    if (e.target.value) {
                                        setDescriptionErrorMessage('');
                                    }
                                    setDescription(e.target.value);
                                }}
                            />}
                            <span className={classNames('error-message')}>{descriptionErrorMessage}</span>
                        </div>
                        <div className={classNames('input-field-group include-error')}>
                            <label id="description" className="input-label" htmlFor="description">
                                Instance <sup>*</sup>
                            </label>
                            <div className={Styles.radioBtnsGrid}>
                                <div key={'On-Premise'}>
                                    <label className={'radio'}>
                                        <span className="wrapper">
                                            <input
                                                type="radio"
                                                className="ff-only"
                                                name="projectGroup"
                                                value={projectGroup}
                                                onChange={() => {
                                                    if (projectGroup) {
                                                        setProjectGroupErrorMessage('');
                                                    }
                                                    setProjectGroup('onPremise');
                                                }}
                                                checked={props.isEdit ? props.editDataikuProjectDetail?.cloudProfile === 'onPremise' : projectGroup === 'onPremise'}
                                                disabled={props.isEdit}
                                            />
                                        </span>
                                        <span className="label">{'On-Premise'}</span>
                                    </label>
                                </div>
                                <div key={'Extollo'}>
                                    <label className={'radio'}>
                                        <span className="wrapper">
                                            <input
                                                type="radio"
                                                className="ff-only"
                                                name="projectGroup"
                                                value={projectGroup}
                                                onChange={() => {
                                                    if (projectGroup) {
                                                        setProjectGroupErrorMessage('');
                                                    }
                                                    setProjectGroup('extollo');
                                                }}
                                                checked={props.isEdit ? props.editDataikuProjectDetail?.cloudProfile === 'extollo' : projectGroup === 'extollo'}
                                                disabled={props.isEdit}
                                            />
                                        </span>
                                        <span className="label">{'Extollo'}</span>
                                    </label>
                                </div>
                            </div>
                            <span className={classNames('error-message')}> {projectGroupErrorMessage}</span>
                        </div>
                    </div>
                </div>
                <div className={classNames('input-field-group include-error', Styles.adduser)}>
                    <AddUser getCollabarators={getCollabarators} isRequired={false} isUserprivilegeSearch={true} />
                </div>
                <div className={Styles.bucketColUsersList}>
                    {dataikuCollaborators?.length > 0 ? (
                        <React.Fragment>
                            <div className={Styles.collUserTitle}>
                                <div className={Styles.collUserTitleCol}>User ID</div>
                                <div className={Styles.collUserTitleCol}>Name</div>
                                <div className={Styles.collUserTitleCol}>Permission</div>
                                <div className={Styles.collUserTitleCol}></div>
                            </div>
                            <div className={classNames('mbc-scroll', Styles.collUserContent)}>
                                {dataikuCollaborators
                                    ?.map((item) => {
                                        return (
                                            <div key={item.userId} className={Styles.collUserContentRow}>
                                                <div className={Styles.collUserTitleCol}>{item.userId}</div>
                                                <div className={Styles.collUserTitleCol}>{item.givenName + ' ' + item.surName}</div>
                                                <div className={Styles.collUserTitleCol}>
                                                    <div className={classNames('input-field-group include-error ' + Styles.inputGrp)}>
                                                        <label className={classNames('checkbox', Styles.checkBoxDisable)}>
                                                            <span className="wrapper">
                                                                <input
                                                                    type="radio"
                                                                    className="ff-only"
                                                                    name={item.userId}
                                                                    value="administrator"
                                                                    checked={item?.permission === 'administrator'}
                                                                    onChange={(e) => onCollaboratorPermission(e, item?.userId)}
                                                                />
                                                            </span>
                                                            <span className="label">Administrator</span>
                                                        </label>
                                                    </div>
                                                    &nbsp;&nbsp;&nbsp;
                                                    <div className={classNames('input-field-group include-error ' + Styles.inputGrp)}>
                                                        <label className={'checkbox'}>
                                                            <span className="wrapper">
                                                                <input
                                                                    type="radio"
                                                                    className="ff-only"
                                                                    name={item.userId}
                                                                    value="contributor"
                                                                    checked={item?.permission === 'contributor'}
                                                                    onChange={(e) => onCollaboratorPermission(e, item.userId)}
                                                                />
                                                            </span>
                                                            <span className="label">contributor</span>
                                                        </label>
                                                    </div>
                                                    &nbsp;&nbsp;&nbsp;
                                                    <div className={classNames('input-field-group include-error ' + Styles.inputGrp)}>
                                                        <label className={'checkbox'}>
                                                            <span className="wrapper">
                                                                <input
                                                                    type="radio"
                                                                    className="ff-only"
                                                                    name={item.userId}
                                                                    value="reader"
                                                                    checked={item?.permission === 'reader'}
                                                                    onChange={(e) => onCollaboratorPermission(e, item.userId)}
                                                                />
                                                            </span>
                                                            <span className="label">reader</span>
                                                        </label>
                                                    </div>
                                                </div>
                                                <div className={Styles.collUserTitleCol}>
                                                    <div className={Styles.deleteEntry}
                                                        onClick={onCollabaratorDelete(item.userId)}
                                                    >
                                                        <i className="icon mbc-icon trash-outline" />
                                                        Delete Entry
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        </React.Fragment>
                    ) : (
                        <div className={Styles.bucketColContentEmpty}>
                            <h6> Collaborators Not Exist!</h6>
                        </div>
                    )}
                </div>
                <div className={Styles.submitButtton}>
                    <button
                        className={classNames(!isUserCanCreateDataiku ? 'btn indraft' : 'btn btn-tertiary')}
                        type="button"
                        onClick={(() => {
                            handleCreateDataikuSubmit();
                        })}
                        title='users with a access can only create a dataiku project'
                        disabled={!isUserCanCreateDataiku}
                    >
                        {'Submit'}
                    </button>
                </div>
            </div>
            <div>
            </div>
        </div>
    );
};

export default CreateOrEditProject;
