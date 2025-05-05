import './App.css'
import { Stepper, Button, Group, Title, Stack, Box, Text, Image, Slider, Card, Container, Loader } from '@mantine/core';
import { Dropzone, FileRejection, MIME_TYPES } from '@mantine/dropzone';
import { IconUpload, IconPencil, IconEraser, IconCircleCheck } from '@tabler/icons-react'; // Optional icons
import 'react-mask-editor/dist/style.css'; // Importing the CSS for react-mask-editor
import '@mantine/core/styles.css';
import { useRef, useState, useEffect } from 'react';
import { Stage, Layer, Image as KonvaImage, Line, Circle } from 'react-konva';
import useImage from 'use-image';

const logos = [
  '/logos/Tensorrt.png',
  '/logos/onnx.png',
  '/logos/ec2.jpg',
  '/logos/runpod.jpg',
  '/logos/triton.png',
  '/logos/pythera.png',
  '/logos/pytorchligting.png',
  '/logos/fpt.svg',
  '/logos/hf-logo-with-title.png',
];

<style>
  {`
    * {
      margin: 0;
      padding: 0;
    }
  `}
</style>

function App() {

  const getMaskBase64 = (): string | null => {
    const stage = stageRef.current;
    if (!stage) return null;
  
    // Export only the second Layer (the one with drawings)
    const drawingLayer = stage.getLayers()[1]; // index 1 = mask layer
    const dataURL = drawingLayer.toDataURL({ pixelRatio: 1 });
  
    // Strip the data:image/png;base64, prefix
    return dataURL.split(',')[1];
  };
  

  const [preview, setPreview] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const nextStep = () => setActive((current) => (current < 5 ? current + 1 : current));
  const prevStep = () => setActive((current) => Math.max(current - 1, 0));
  const [lines, setLines] = useState<{ points: number[]; isErasing?: boolean; cursorSize?: number }[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const stageRef = useRef<any>(null);
  const [image] = useImage(preview || '');
  const [isErasing, setIsErasing] = useState(false);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  const [cursorSize, setCursorSize] = useState(20);
  const [origB64, setOrigB64] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);


  const handleDrop = (files: File[]) => {
    const file = files[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setPreview(previewUrl);
  
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1]; // remove data:image/...;base64,
        setOrigB64(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const finishStep = () => {
    setActive(0);
    setLines([]);
    setCursorSize(20);
    setPreview(null);
    setOrigB64(null);
  }
  

  const handleRemove = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
  };

  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, []);

  const handleMouseDown = (e: any) => {
    setIsDrawing(true);
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    setLines([
      ...lines,
      {
        points: [point.x, point.y],
        isErasing,
        cursorSize, // capture the current stroke width
      },
    ]);
  };


  const handleMouseMove = (e: any) => {
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    if (point) {
      setMousePosition(point); // Update cursor position
    }

    if (!isDrawing) return;

    const lastLine = lines[lines.length - 1];
    const updatedLine = {
      ...lastLine,
      points: lastLine.points.concat([point.x, point.y]),
    };
    const newLines = [...lines.slice(0, -1), updatedLine];
    setLines(newLines);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const clearLines = () => {
    setLines([]);
    setCursorSize(20);
  };


  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  const maxWidth = screenWidth / 2;
  const maxHeight = screenHeight;

  let scale = 1;
  // @ts-expect-error: Exclude from build
  let imageX = 0;
  // @ts-expect-error: Exclude from build
  let imageY = 0;
  let stageWidth = 0;
  let stageHeight = 0;

  if (image) {
    const scaleX = maxWidth / image.width;
    const scaleY = maxHeight / image.height;
    scale = Math.min(scaleX, scaleY, 1);

    const scaledWidth = image.width * scale;
    const scaledHeight = image.height * scale;

    stageWidth = maxWidth;
    stageHeight = maxHeight;

    // Center image in stage
    imageX = (stageWidth - scaledWidth) / 2;
    imageY = (stageHeight - scaledHeight) / 2;
  }

  const sendRequest = async () => {
    if (!origB64) {
      console.error("Original image is not loaded yet.");
      return;
    }
  
    const maskB64 = getMaskBase64();
    if (!maskB64) {
      console.error("Mask image could not be generated.");
      return;
    }
  
    const API_KEY = "rpa_I45AJ1AT9H80SE3EKW520CDRHAN7VY9PT7Z7429Z1z0e6t";
    const scale = 2.5;
    const step = 60;
  
    const payload = {
      input: {
        ori_iamge: origB64,
        mask: maskB64,
        scale: scale,
        step: step
      }
    };
  
    nextStep();
    setIsLoading(true); // Set loading state to true
  
    try {
      const response = await fetch("https://api.runpod.ai/v2/7tqskzc2yrb73r/runsync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`
        },
        body: JSON.stringify(payload)
      });
  
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }
  
      const data = await response.json();
      clearLines(); 
      setPreview(null); // Clear the preview
      const resultImage = `data:image/png;base64,${data.output.result_image}`;
      setPreview(resultImage); // Update the preview with the processed image
    } catch (error) {
      console.error("Error sending request:", error);
    } finally {
      setIsLoading(false); // Set loading state to false
      nextStep(); // Move to the next step
    }
  };
  

  return (
    <>
      <Box
        style={{
          position: 'absolute', // stays at the top
          top: 0,
          left: 0,
          zIndex: 1000, // make sure it's above everything else
          width: '100%',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
        }}
        mb={50}
      >
        <Box
          component="div"
          style={{
            display: 'flex',
            animation: `scroll-left 20s linear infinite`, // Adjust animation duration as needed
          }}
        >
          {logos.map((logo, index) => (
            <Image
              key={index}
              src={logo}
              alt={`Logo ${index + 1}`}
              height={50}
              style={{
                display: 'inline-block',
                marginRight: '80px',
                verticalAlign: 'middle',
              }}
            />
          ))}
          {logos.map((logo, index) => (
            <Image
              key={`duplicate-${index}`}
              src={logo}
              alt={`Logo ${index + 1}`}
              height={50}
              style={{
                display: 'inline-block',
                marginRight: '80px',
                verticalAlign: 'middle',
              }}
            />
          ))}
        </Box>

        <style>
          {`
        @keyframes scroll-left {
        0% {
          transform: translateX(0%);
        }
        100% {
          transform: translateX(-100%);
        }
        }
      `}
        </style>
      </Box>
      <Container fluid pt={50}>
        <Stack
          align="stretch"
          justify="center"
          gap="lg"
        >
          <Box mb={10}>
            <Title
              order={1}
              style={{
                fontWeight: 800,
                fontSize: '3rem',
                textAlign: 'center',
                background: 'linear-gradient(90deg, #00DBDE 0%, #FC00FF 100%)', // beautiful AI gradient
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: '0 0 10px rgba(0, 219, 222, 0.5)', // subtle glow
                letterSpacing: '1px',
                animation: 'glowing 2.5s ease-in-out infinite alternate', // Add glowing animation
              }}
            >
              DEEP LEARNING MECHANISM FOR OBJECT REMOVAL TO ENHANCE BACKGROUND
            </Title>
          </Box>
          <Box p={30}
            style={{
              border: '1px solid #000',
              borderRadius: '30px',
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
            }}>
            <Stepper active={active} onStepClick={setActive}>
              <Stepper.Step label="Welcome" description="">
              </Stepper.Step>
              <Stepper.Step label="Select image" description="">
              </Stepper.Step>
              <Stepper.Step label="Masking the image" description="">
              </Stepper.Step>
              <Stepper.Step label="Processing Image" description="">
              </Stepper.Step>
              <Stepper.Step label="Final result" description="">
              </Stepper.Step>
              <Stepper.Completed>
                Completed, click finish to send a new request
              </Stepper.Completed>
            </Stepper>
          </Box>
            <Box
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: image ? image.width : '100%',
              height: 'auto', // Automatically adjusts height based on content
              padding: 30,
            }}
            >
            <>
              {active === 0 && (
              <>
                <Title>Welcome to ...</Title>
                <Text>Upload your photo to remove the background</Text>
                <Group justify="center" mt="xl">
                <Button onClick={nextStep}>Next step</Button>
                </Group>
              </>
              )}
              {active === 1 && (
              <>
              <Box>
              <Title>Upload Your Photo</Title>
                <Text mb={10}>Upload your photo to remove the background</Text>
                <Dropzone
                onDrop={handleDrop}
                onReject={(files: FileRejection[]) => {
                  console.log('Rejected files', files);
                }}
                maxSize={5 * 1024 ** 2} // 5 MB
                accept={[MIME_TYPES.jpeg, MIME_TYPES.png]}
                multiple={false}
                style={{
                  border: '1px dashed #ccc',
                  borderRadius: '30px',
                  height: preview ? stageHeight : '60vh', // Dynamic height for nice display
                  backgroundColor: '#f9f9f9',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
                >
                {preview ? (
                  <Image
                  src={preview}
                  alt="Preview"
                  style={{
                    border: '1px solid #ccc',
                    marginTop: 20,
                    borderRadius: '20px',
                    display: 'flex',
                    marginLeft: 'auto',
                    marginRight: 'auto',
                    overflow: 'hidden',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                  }}
                  />
                ) : (
                  <Group justify="center">
                  <IconUpload size={50} stroke={1.5} color="#888" />
                  <Text size="md" color="dimmed">Drag an image here or click to select</Text>
                  </Group>
                )}
                </Dropzone>
                <Group justify="center" mt="xl">
                <Button variant="default" onClick={prevStep}>Back</Button>
                <Button onClick={nextStep}>Next step</Button>
                </Group>
                {preview && (
                <Button
                  color="red"
                  variant="light"
                  onClick={handleRemove}
                  mt="sm"
                >
                  Remove Image
                </Button>
                )}
              </Box>
                
              </>
              )}
              {active === 2 && (
              <>
                <Title>Masking the Image</Title>
                <Text>Select where you want to remove</Text>
                <Card withBorder padding="lg" radius="md" mt="md">
                <Stack gap="md" w={image ? image.width : '100%'}>
                  <Group justify="space-between">
                  <Group justify="flex-start">
                    <Button leftSection={<IconEraser size={16} />} onClick={() => setIsErasing(true)} variant={isErasing ? "filled" : "outline"} color="red">Eraser</Button>
                    <Button leftSection={<IconPencil size={16} />} onClick={() => setIsErasing(false)} variant={!isErasing ? "filled" : "outline"} color="blue">Draw</Button>
                  </Group>
                  <Button variant="outline" color="red" onClick={clearLines}>Reset All</Button>
                  </Group>
                  <Box>
                  <Text size="sm" mb={4}>
                    Brush Size: {cursorSize}px
                  </Text>
                  <Slider
                    mb={10}
                    color="blue"
                    value={cursorSize}
                    min={20}
                    max={80}
                    step={10}
                    marks={[
                    { value: 20, label: "20" },
                    { value: 40, label: "40" },
                    { value: 60, label: "60" },
                    { value: 80, label: "80" },
                    ]}
                    onChange={setCursorSize}
                  />
                  </Box>
                </Stack>
                </Card>
                {image && (
                <>
                  <Stage
                  width={image.width}
                  height={image.height}
                  onMouseDown={handleMouseDown}
                  onMousemove={handleMouseMove}
                  onMouseup={handleMouseUp}
                  ref={stageRef}
                  onMouseLeave={() => setMousePosition(null)}
                  style={{
                    marginTop: 20,
                    alignItems: 'center',
                    justifyContent: 'center',
                    display: 'flex',
                  }}
                  >
                  <Layer>
                    <KonvaImage
                    image={image}
                    />
                  </Layer>
                  <Layer>
                    {lines.map((line, i) => (
                    <Line
                      key={i}
                      points={line.points}
                      stroke="white"
                      strokeWidth={line.cursorSize}
                      tension={0.5}
                      lineCap="round"
                      lineJoin="round"
                      globalCompositeOperation={line.isErasing ? 'destination-out' : 'source-over'}
                    />
                    ))}
                    {mousePosition && (
                    <Circle
                      x={mousePosition.x}
                      y={mousePosition.y}
                      radius={cursorSize / 2}
                      stroke={isErasing ? "red" : "blue"}
                      strokeWidth={2}
                      dash={[4, 4]}
                      listening={false}
                      opacity={0.8}
                    />
                    )}
                  </Layer>
                  </Stage>

                </>
                )}
                <Group justify="center" mt="xl">
                <Button variant="default" onClick={prevStep}>Back</Button>
                <Button onClick={sendRequest}>Proceed</Button>
                </Group>
              </>
              )}
              {active === 3 && (
              <>
                <Title>Processing Image</Title>
                <Text>Processing your image...</Text>
                {isLoading && (
                <Loader size={50} />
                )}
              </>
              )}
              {active === 4 && (
              <>
                <Title>Final Result</Title>
                <Text>Your image has been processed successfully!</Text>
                <Box>
                <IconCircleCheck size={150} color="green" />
                </Box>
                  <Group justify="center" mt="xl">
                    <Button variant="default" onClick={prevStep}>Back</Button>
                    <Button onClick={nextStep}>See result</Button>
                  </Group>
                </>
              )}
              {active === 5 && (
                <>
                  <Title>Thank You!</Title>
                  <Text>Your image has been processed successfully!</Text>
                  {!isLoading && preview && (
                    <Image
                      src={preview}
                      alt="Processed Image"
                      style={{
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                      }}
                    />
                  )}
                  <Group justify="center" mt="xl">
                    <Button variant="default" onClick={prevStep}>Back</Button>
                    <Button onClick={finishStep}>Finish</Button>
                  </Group>
                </>
              )}
            </>
          </Box>

        </Stack>
      </Container>

      <style>
        {`
    @keyframes glowing {
      0% {
        text-shadow: 0 0 5px rgba(0, 219, 222, 0.5), 0 0 10px rgba(0, 219, 222, 0.3), 0 0 15px rgba(0, 219, 222, 0.1);
        color: #00DBDE;
      }
      50% {
        text-shadow: 0 0 20px rgba(0, 219, 222, 1), 0 0 30px rgba(0, 219, 222, 0.7), 0 0 50px rgba(0, 219, 222, 0.3);
        color: #FC00FF;
      }
      100% {
        text-shadow: 0 0 5px rgba(0, 219, 222, 0.5), 0 0 10px rgba(0, 219, 222, 0.3), 0 0 15px rgba(0, 219, 222, 0.1);
        color: #00DBDE;
      }
    }
  `}
      </style>
    </>
  )
}

export default App
