import IncomingMessage from '../incomingMessage/IncomingMessage';

export default function OutgoingMessage(props) {
  return <IncomingMessage {...props} isOwn />;
}
