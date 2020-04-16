import * as React from 'react'
import { observer } from 'mobx-react'
import { Modal, ModalHeader, ModalBody, Spinner } from 'reactstrap'

export interface LoadingModalProps {
    imageDataLoading: boolean
    segmentationDataLoading: boolean
}

@observer
export class LoadingModal extends React.Component<LoadingModalProps, {}> {
    public constructor(props: LoadingModalProps) {
        super(props)
    }

    public render(): React.ReactNode {
        let modal = null
        if (this.props.imageDataLoading || this.props.segmentationDataLoading) {
            const modalType = this.props.imageDataLoading ? 'Image Data' : 'Segmentation Data'
            modal = (
                <Modal isOpen={true}>
                    <ModalHeader>{modalType} is loading...</ModalHeader>
                    <ModalBody>
                        <div style={{ textAlign: 'center' }}>
                            <Spinner style={{ width: '5rem', height: '5rem' }} color="secondary" />
                        </div>
                    </ModalBody>
                </Modal>
            )
        }
        return modal
    }
}
