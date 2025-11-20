import time
import grpc
import simulation_pb2
import simulation_pb2_grpc
import os
import random
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("AudioService")

CONTROLLER_HOST = os.environ.get('CONTROLLER_HOST', 'localhost')
CONTROLLER_PORT = os.environ.get('CONTROLLER_PORT', '50051')

def run():
    logger.info(f"Connecting to controller at {CONTROLLER_HOST}:{CONTROLLER_PORT}...")
    channel = grpc.insecure_channel(f'{CONTROLLER_HOST}:{CONTROLLER_PORT}')
    stub = simulation_pb2_grpc.ControllerServiceStub(channel)

    # Wait for controller to be ready
    time.sleep(5) 

    while True:
        try:
            # Simulate a beat event
            beat_event = simulation_pb2.AudioEvent(
                event_type="BEAT",
                value=1.0,
                timestamp=time.time(),
                metadata={"intensity": "high"}
            )
            logger.info("Sending BEAT event")
            stub.PublishAudioEvent(beat_event)
            
            time.sleep(0.5) # 120 BPM

            # Simulate a pitch change occasionally
            if random.random() < 0.2:
                pitch_event = simulation_pb2.AudioEvent(
                    event_type="PITCH_CHANGE",
                    value=random.uniform(0.5, 2.0),
                    timestamp=time.time()
                )
                logger.info(f"Sending PITCH_CHANGE event: {pitch_event.value}")
                stub.PublishAudioEvent(pitch_event)

        except grpc.RpcError as e:
            logger.error(f"RPC failed: {e}")
            time.sleep(2)
        except Exception as e:
            logger.error(f"Error: {e}")
            time.sleep(2)

if __name__ == '__main__':
    run()
